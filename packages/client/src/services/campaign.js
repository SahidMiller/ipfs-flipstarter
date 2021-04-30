import { HttpServerConnector } from '../server-connector.js'
import { Libp2pServerConnector } from '../server-ipfs-connector.js'
import { calculateTotalRecipientMinerFees  } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"
import EventEmitter from 'events'

class Campaign {
    
    constructor(campaign, targetFeeRate) {
        this.targetFeeRate = targetFeeRate

        this.id = campaign.id
        this.title = campaign.title
        this.recipients = campaign.recipients
        this.descriptions = campaign.descriptions
        this.starts = campaign.starts
        this.expires = campaign.expires
        this.contributions = campaign.contributions

        this.fullfilled = campaign.fullfilled
        this.fullfillmentTimestamp = campaign.fullfillmentTimestamp
        this.fullfillmentTx = campaign.fullfillmentTx

        this.apiType = campaign.apiType
        this.address = campaign.address
        this.rewardUrl = campaign.rewardUrl
    }

    get requestedSatoshis() {

        if (this._requestedSatoshis) {
            return this._requestedSatoshis
        }

        this._requestedSatoshis = this.recipients.reduce((sum, recipient) => {
          return sum + recipient.satoshis
        }, 0)

        return this._requestedSatoshis
    }

    get minerFee() {
        return calculateTotalRecipientMinerFees(this.recipients.length, this.targetFeeRate)
    }
}

export default class CampaignService extends EventEmitter {
    
    constructor({ targetFeeRate = 1 } = {}) {
        super()
        this.targetFeeRate = targetFeeRate
        this.campaign = undefined
    }

    getCampaign() {
        return this.campaign
    }

    async init() {
        // Fetch the campaign information from the backend.
        this.campaign = new Campaign(await (await fetch('campaign.json')).json(), this.targetFeeRate)

        //TODO Error if nothing is set?
        if (this.campaign.apiType === "ipfs") {
            this.server = new Libp2pServerConnector()
        } else {
            this.server = new HttpServerConnector() 
        }

        //Notify when updated
        const self = this
        this.server.on('update', (campaign) => {
            this.campaign = campaign
            self.emit('update', campaign)
        })

        //Listen for updates
        await this.server.listen(this.campaign)
        
        //Notify initial value
        this.emit('update', this.campaign)

        return this.campaign
    }

    async contribute(commitmentObject) {
        return await this.server.contribute(commitmentObject)
    }

    subscribe(cb) {
        if (this.campaign) {
            cb(this.campaign)
        }

        return this.on("update", cb)
    }
}