// Load and initialize the DOMPurify library to ensure safety for parsed markdown.
import createDOMPurify from "dompurify"
import { SATS_PER_BCH, calculateTotalRecipientMinerFees  } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"

const DOMPurify = createDOMPurify(window)

export default class ProgressBar {
    constructor({
        campaignContributionAmount,
        campaignContributionBar,
        campaignProgressBar,
        campaignRequestAmount
    }, campaignService, donationService) {
        this.campaignService = campaignService
        this.donationService = donationService

        this.campaignRequestAmount = campaignRequestAmount
        this.campaignContributionAmount = campaignContributionAmount
        this.campaignContributionBar = campaignContributionBar
        this.campaignProgressBar = campaignProgressBar
    }

    init() {
        this.updateCurrentRequestedAmount({ recipients: [] })
        
        const self = this
        this.campaignService.subscribe((campaign) => {

            self.updateCurrentRequestedAmount(campaign)
            self.updateTotalRaisedProgressBar(campaign)
        })

        this.donationService.on('update', (donation) => {
            const campaign = self.campaignService.getCampaign()

            if (campaign && campaign.requestedSatoshis) {
                
                const sats = donation.satoshis || 0
                self.updateCurrentContributionBar(campaign, sats / campaign.requestedSatoshis)
            }
        })
    }

    updateTotalRaisedProgressBar(campaign) {
        // .. update the progress bar and contribution amount
        // .. include base campaign miner fee to cover output costs (contributors handle their own inputs, God willing)
        const requestedSatoshis = (campaign.requestedSatoshis || 0) + (calculateTotalRecipientMinerFees(campaign.recipients.length) || 0)
        const committedSatoshis = (campaign.committedSatoshis || 0) - (campaign.totalCommittedMinerFees || 0)

        const contributionAmount =  (committedSatoshis / SATS_PER_BCH).toFixed(8)
        const contributionBar = (100 * (committedSatoshis / requestedSatoshis)).toFixed(2)
        
        // .. move the current contribution bar accordingly.
        //This may not be right, on update, move the other guys stuff, God willing
        if (this.campaignContributionAmount) {
            this.campaignContributionAmount.textContent = DOMPurify.sanitize(contributionAmount);
        }

        if (this.campaignContributionBar) {
            this.campaignContributionBar.style.left = contributionBar + "%";
        }

        if (this.campaignProgressBar) {
            this.campaignProgressBar.style.width = contributionBar + "%";
        }
    }

    updateCurrentContributionBar(campaign, targetPercentage) {
        const requestedSatoshis = (campaign.requestedSatoshis || 0) + (calculateTotalRecipientMinerFees(campaign.recipients.length) || 0)
        const committedSatoshis = (campaign.committedSatoshis || 0) - (campaign.totalCommittedMinerFees || 0)

        //TODO God willing, not only change bar when donation updates, God willing, but also as contributions come in
        const contributionBarOffset = (100 * (committedSatoshis / requestedSatoshis)).toFixed(2)
        const contributionBarWidth = (targetPercentage * (1 - committedSatoshis / requestedSatoshis)).toFixed(2)

        if (this.campaignContributionBar) {
            this.campaignContributionBar.style.left = contributionBarOffset + "%";
        }

        if (this.campaignContributionBar) {
            this.campaignContributionBar.style.width = contributionBarWidth + "%";
        }
    }

    updateCurrentRequestedAmount(campaign) {
        //Show the fees needed per recipient byte (1 byte per sat fee rate)
        if (!campaign || !campaign.recipients || !campaign.recipients.length || !campaign.requestedSatoshis) {
            
            if (this.campaignRequestAmount) {
                this.campaignRequestAmount.textContent = "";
            }
        
        } else {

            const requestedSatoshis = campaign.requestedSatoshis + calculateTotalRecipientMinerFees(campaign.recipients.length)
            const requestedSatoshisText = (requestedSatoshis / SATS_PER_BCH).toFixed(8)

            if (this.campaignRequestAmount) {
                this.campaignRequestAmount.textContent = DOMPurify.sanitize(requestedSatoshisText);
            }
        }
    }
}