// Load and initialize the DOMPurify library to ensure safety for parsed markdown.
import createDOMPurify from "dompurify"
import { SATS_PER_BCH, calculateTotalContributorMinerFees } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"

const DOMPurify = createDOMPurify(window)

export default class ContributionsList {
    constructor({ contributionsList, contributionCount, emptyContributionsTemplate, contributionTemplate }, campaignService) {
      this.contributionsList = contributionsList
      this.contributionCount = contributionCount
      this.emptyContributionsTemplate = emptyContributionsTemplate
      this.contributionTemplate = contributionTemplate

      this.campaignService = campaignService
    }

    init() {

      if (this.campaignService.campaign){
        this.updateContributionList(this.campaignService.campaign)
      }
        
      this.campaignService.on('update', (campaign) => {
          // .. update the contribution list.
          this.updateContributionList(campaign);            
      })

      return this
    }

    async updateContributionList(campaign) {
    
      // Empty the contribution list.
      this.contributionsList.textContent = "";
  
      // Update the contribution counter.
      this.contributionCount.textContent = campaign.commitmentCount || 0;
  
      if (campaign.commitmentCount === 0) {
        // Get the empty message template node.
        const template = this.emptyContributionsTemplate.content.firstElementChild;
  
        // Import a copy of the template.
        const contributionMessage = document.importNode(template, true);
  
        // Add the copy to the contribution list.
        this.contributionsList.appendChild(contributionMessage);
  
      } else {
        
        //Base percentage from full value including output fees
        const requestedSatoshis = (campaign.requestedSatoshis || 0) + (campaign.minerFee || 0)
  
        //Display minus fees to reflect satoshis to campaign recipients rather than full contract (until completed)
        const feeRate = !campaign.fullfilled ? 
          this.campaignService.targetFeeRate : 
          calculateActualFeeRate(
            campaign.recipients.length,
            campaign.requestedSatoshis,
            // After fullfilled, we want only true commitments (not over commitments), God willing.
            campaign.commitmentCount,
            campaign.committedSatoshis
          )
  
        const contributorFees = calculateTotalContributorMinerFees(1, feeRate)
  
        campaign.contributions
          .slice()
          .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
          .forEach((commitment => {
            //Base percentage from commitment minus standard fees, God willing
            this.addContributionToList(
              commitment.alias,
              commitment.comment,
              (commitment.satoshis - contributorFees),
              (commitment.satoshis - contributorFees) / requestedSatoshis
            )
          }).bind(this))
      }

      return this
    }
    
    addContributionToList(alias, comment, amount, percent) {
   
        // Get the template node.
        const template = this.contributionTemplate.content.firstElementChild;
    
        // Import a copy of the template.
        const contributionEntry = document.importNode(template, true);
    
        // Calculate water level and randomize animation delay.
        const backgroundMin = 0.1;
        const backgroundMax = 3.5;
        const backgroundPosition = (backgroundMin + backgroundMax * (1 - percent)).toFixed(2);
        const animationLength = 15;
        const animationDelay = (Math.random() * animationLength).toFixed(2);
        const contributionAmount = (amount / SATS_PER_BCH).toFixed(8);
    
        // Update the data on the copy.
        contributionEntry.querySelector(".contributionWaves").style.backgroundPosition = `0 ${backgroundPosition}rem`;
        contributionEntry.querySelector(".contributionWaves").style.animationDelay = `-${animationDelay}s`;
        contributionEntry.querySelector(".contributionPercent").textContent = (percent * 100).toFixed(0) + "%";
        contributionEntry.querySelector(".contributionAlias").textContent = alias;
        contributionEntry.querySelector(".contributionComment").textContent = DOMPurify.sanitize(comment, { ALLOWED_TAGS: [] });
        contributionEntry.querySelector(".contributionAmount").textContent = `${contributionAmount} BCH`;
    
        // Hide the comment if not existing.
        if (!comment) {
          contributionEntry.querySelector(".contributionComment").style.display = "none";
        }
    
        // Mark username as anonymous if not existing.
        if (!alias) {
          contributionEntry.querySelector(".contributionAlias").style.opacity = 0.37;
          contributionEntry.querySelector(".contributionAlias").textContent = "Anonymous";
        }
    
        // Add the copy to the contribution list.
        this.contributionsList.appendChild(contributionEntry);

        return this
    }
}
