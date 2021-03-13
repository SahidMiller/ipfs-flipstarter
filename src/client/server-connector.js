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
		this.campaign.contributions = this.campaign.contributions || []
		this.campaign.commitmentCount = this.campaign.contributions.length
		this.campaign.committedSatoshis = getCommittedSatoshis(this.campaign.contributions)
		
		return this.campaign
	}

	async contribute(contribution) {
	    const submissionOptions = {
	      method: "POST",
	      cors: 'no-cors',
	      cache: "no-cache",
	      credentials: "same-origin",
	      headers: {
	        "Content-Type": "application/json",
	      },
	      body: JSON.stringify(contribution),
	    };

		const apiUrl = this.campaign.address.replace(/\/$/, "") + "/submit/" + this.campaign.id
	    // Submit the commitment to the backend.
	    const response = await fetch(
			apiUrl,
	      submissionOptions
	    );

	    return await response.json()
	}

	listen(campaign) {
		const self = this
		this.campaign = campaign

		let eventSourceApi = this.campaign.address.replace(/\/$/, "") + "/events/" + this.campaign.id
	    const eventSource = new EventSource(eventSourceApi, { cors: 'no-cors' });

		const addContribution = (eventData) => {
		      // .. store the contribution locally.
			campaign.contributions[eventData.contribution_id] = {
				commitmentId:  eventData.commitment_id,
				contributionId: eventData.contribution_id,
				alias: eventData.user_alias,
				timestamp: eventData.contribution_timestamp,
				comment: eventData.contribution_comment,
				txHash: eventData.previous_transaction_hash,
				txIndex: eventData.previous_transaction_index,
				unlockScript: eventData.unlock_script,
				seqNum: eventData.sequence_number,
				satoshis: eventData.satoshis
			};

			campaign.contributions = campaign.contributions || []
			campaign.commitmentCount = campaign.contributions.length
			campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)
		}

		eventSource.addEventListener("init", (event) => {
			const contributions = JSON.parse(event.data);
			contributions.forEach(addContribution)
			self.emit('update', campaign)
		})

	    eventSource.addEventListener("contribution", (event) => {
			const eventData = JSON.parse(event.data);
			addContribution(eventData)
			self.emit('update', campaign)
		})

	    eventSource.addEventListener("revocation", (event) => {
			const eventData = JSON.parse(event.data);

			// .. if the data has been revoked before fullfillment..
			if (campaign.fullfilled && eventData.revocation_timestamp > campaign.fullfillmentTimestamp) {
				
				// .. remove it if we know it from earlier
				if (campaign.contributions[eventData.contribution_id]) {
					// Delete it locally.
					delete campaign.contributions[eventData.contribution_id];
					campaign.commitmentCount = campaign.contributions.length
					campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)

					self.emit('update', campaign)
				}
			}
		})

	    eventSource.addEventListener("fullfillment", (event) => {
			const eventData = JSON.parse(event.data);
  
			// Special case: fullfillment.
			if (eventData.fullfillment_transaction) {
			
				campaign.fullfilled = true
				campaign.fullfillmentTimestamp = evendData.fullfillment_timestamp
				campaign.fullfillmentTx = eventData.fullfillment_transaction
			}
  
			self.emit('update', campaign)
		  })
	}
}

function getCommittedSatoshis(commitments) {
	return commitments.reduce((sum, commitment) => {
		return sum + commitment.satoshis
	}, 0)
}