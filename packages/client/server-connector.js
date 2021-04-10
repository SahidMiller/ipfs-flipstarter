import EventEmitter from 'events'
import { bitcoinCashUtilities } from "@ipfs-flipstarter/utils"
const { calculateTotalContributorMinerFees } = bitcoinCashUtilities

export class HttpServerConnector extends EventEmitter {
	
	async getCampaign() {
		const pathparts = window.location.pathname.split('/')
		const campaignIdIndex = pathparts.indexOf('campaign')
		//Campaign ID not require for standalone
		const campaignId = campaignIdIndex !== -1 ? 
			pathparts[campaignIdIndex + 1] : ""
		const response = await fetch('/api/campaign/' + campaignId, { mode: "no-cors" })
		this.campaign = await response.json()
		this.campaign.contributions = this.campaign.contributions || []
		this.campaign.commitmentCount = this.campaign.contributions.length
		this.campaign.committedSatoshis = getCommittedSatoshis(this.campaign.contributions)
		this.campaign.totalCommittedMinerFees = calculateTotalContributorMinerFees(this.campaign.commitmentCount)

		return this.campaign
	}

	async contribute(contribution) {
	    const submissionOptions = {
	      method: "POST",
	      mode: 'no-cors',
	      cache: "no-cache",
	      credentials: "same-origin",
	      headers: {
	        "Content-Type": "application/json",
	      },
	      body: JSON.stringify(contribution),
	    };

		// TODO God willing: check if campaign has an ID (if not may not even consider as https api nor ipfs)
		const apiUrl = this.campaign.address.replace(/\/$/, "") + "/submit/" + this.campaign.id
	    // Submit the commitment to the backend.
	    const response = await fetch(
			apiUrl,
	      submissionOptions
	    );

	    const serialized = await response.json()
		if (response.status !== 200 && serialized) {
			return { error: serialized.status || (serialized.error && serialized.error.message || serialized.error)}
		} else {
			return serialized
		}
	}

	listen(campaign) {
		const self = this
		this.campaign = campaign

		//TODO God willing: check that campaign has an API address, or else no events AFAIK.
		//TODO God willing: similarly for ID to identify ourselves with API, God willing.
		let eventSourceApi = this.campaign.address.replace(/\/$/, "") + "/events/" + this.campaign.id
	    const eventSource = new EventSource(eventSourceApi, { mode: 'no-cors' });

		const addContribution = (eventData) => {
			//Remove duplicates before adding
			//may have multiple "init" events
			campaign.contributions = (campaign.contributions || []).filter(contribution => 
				contribution.contributionId !== eventData.contribution_id && 
				contribution.commitmentId !== eventData.commitment_id
			)

		    // .. store the contribution locally.
			campaign.contributions.push({
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
			});
		}

		eventSource.addEventListener("init", (event) => {
			const campaignDetails = JSON.parse(event.data);
			
			campaignDetails.contributions.forEach(addContribution)

			campaign.commitmentCount = campaign.contributions.length
			campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)
			campaign.totalCommittedMinerFees = calculateTotalContributorMinerFees(campaign.commitmentCount)

			// Special case: fullfillment.
			if (campaignDetails.fullfillment_transaction) {
			
				campaign.fullfilled = true
				campaign.fullfillmentTimestamp = campaignDetails.fullfillment_timestamp
				campaign.fullfillmentTx = campaignDetails.fullfillment_transaction
				
				//Once fullfilled, no need to subtract fees from total in case of not hitting target fees but fullfilled.
				campaign.totalCommittedMinerFees = 0
				campaign.campaignMinerFee = 0
			}

			self.emit('update', campaign)
		})

	    eventSource.addEventListener("contribution", (event) => {
			const eventData = JSON.parse(event.data);
	
			addContribution(eventData)

			campaign.commitmentCount = campaign.contributions.length
			campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)
			campaign.totalCommittedMinerFees = calculateTotalContributorMinerFees(campaign.commitmentCount)

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
					campaign.totalCommittedMinerFees = calculateTotalContributorMinerFees(campaign.commitmentCount)

					self.emit('update', campaign)
				}
			}
		})

	    eventSource.addEventListener("fullfillment", (event) => {
			const eventData = JSON.parse(event.data);
  
			// Special case: fullfillment.
			if (eventData.fullfillment_transaction) {
			
				campaign.fullfilled = true
				campaign.fullfillmentTimestamp = eventData.fullfillment_timestamp
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