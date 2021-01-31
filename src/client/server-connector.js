import EventEmitter from 'events'

export class HttpServerConnector extends EventEmitter {
	
	async getCampaign() {
		const pathparts = window.location.pathname.split('/')
		const campaignIdIndex = pathparts.indexOf('campaign')
		//Campaign ID not require for standalone
		const campaignId = campaignIdIndex !== -1 ? 
			pathparts[campaignIdIndex + 1] : ""
		const response = await fetch('/api/campaign/' + campaignId)
		this.campaign = await response.json()
		this.campaign.contributions = []
		return this.campaign
	}

	async contribute(contribution) {
	    const submissionOptions = {
	      method: "POST",
	      mode: "cors",
	      cache: "no-cache",
	      credentials: "same-origin",
	      headers: {
	        "Content-Type": "application/json",
	      },
	      body: JSON.stringify(contribution),
	    };

	    // Submit the commitment to the backend.
	    const response = await fetch(
	      "/submit/" + this.campaign.id,
	      submissionOptions
	    );

	    return await response.json()
	}

	listen(campaign) {

	    const eventSource = new EventSource("/events/");
	    eventSource.addEventListener("message", (event) => {
	      const eventData = JSON.parse(event.data);

	      // Special case: fullfillment.
	      if (eventData.fullfillment_transaction) {
	        
	        if (eventData.campaign_id === campaign.id) {
	          campaign.fullfilled = true
	          campaign.fullfillmentTimestamp = evendData.fullfillment_timestamp
	          campaign.fullfillmentTx = eventData.fullfillment_transaction
	        }
	      } 

	      // If the data refers to the current campaign...
		  if (eventData.campaign_id === campaign.id) {
		    // .. and the data has been revoked before fullfillment..
		    const wasRevokedAfterCampaign = campaign.fullfillment_timestamp && eventData.revocation_timestamp > campaign.fullfillment_timestamp
		    const isRevoked = eventData.revocation_id && !wasRevokedAfterCampaign

		    if (isRevoked) {
		      // .. remove it if we know it from earlier
		      if (campaign.contributions[eventData.contribution_id]) {
		        // Delete it locally.
		        delete campaign.contributions[eventData.contribution_id];
		      }

		    } else {
		      
		      // .. store the contribution locally.
		      campaign.contributions[eventData.contribution_id] = {
		      	commitmentId:  eventData.commitment_id,
		      	contributionId: eventData.contribution_id,
		      	alias: eventData.user_alias,
		      	timestamp: eventData.contribution_timestamp,
		      	comment: eventData.contribution_comment,
		      	txHash: eventData.previous_transaction_hash,
		      	txIndex: evendData.previous_transaction_index,
		      	unlockScript: eventData.unlock_script,
		      	seqNum: eventData.sequence_number,
		      	satoshis: eventData.satoshis
		      };
		    }

		    this.emit('update', campaign)
		  }
	    })
	}
}