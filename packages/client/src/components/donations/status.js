
// Load the moment library to better manage time.
import moment from "moment"

import createDOMPurify from "dompurify"
import { get, set } from 'idb-keyval'

const DOMPurify = createDOMPurify(window)

export default class Status {
    
    constructor(elements, campaignService, translationService) {
        this.campaignService = campaignService
        this.translationService = translationService

        // Check if we already have a fullfillment status message..
        this.donateFieldElem = elements.donateField
        this.donateStatusElem = elements.donateStatus
        this.donateFormElem = elements.donateForm

        this.celebration = elements.celebration
        this.shareUrl = elements.shareUrl
    }

    init() {

        const campaign = this.campaignService.campaign

        const initialize = ((campaign) => {
            const hasntStarted = campaign.starts > moment().unix()
            const hasntEnded = campaign.expires > moment().unix()
    
            // If this campaign has already been fullfilled..
            if (campaign.fullfillmentTimestamp > 0) {
                this.showFullfilledStatus(campaign.fullfillmentTx);
                return
            }
    
            // If this campaign has not yet started.
            if (hasntStarted) {
    
                // Mark the campaign as pending, which prevents form entry.
                this.showPendingStatus(campaign.starts, campaign.expires)
            }
    
            // If this campaign has started and hasn't ended
            if (!hasntStarted && hasntEnded) {
    
                // Hide the status message.
                this.hideStatus(campaign.expires);
            }
    
            // If this campaign has already expired.
            if (!hasntStarted && !hasntEnded) {
    
                // Mark the campaign as expired, which prevents form entry.
                this.showExpiredStatus()
            }

        }).bind(this)

        if (campaign) {
        
            initialize(campaign)
        
        } else {
            
            this.campaignService.on('update', initialize)
        }
    }

    getExistingContribution() {
      return get("contributions")
    }

    setContribution(contribution) {
      const contributions = this.getExistingContributions()
      const next = [...contributions, contribution]
      
      set("contributions", next)

      return next
    }

    // Make the share action clickabe to trigger sharing of the current url.
    shareUrl(url) {

        if (typeof navigator.share === "function") {

            navigator.share({
                title: this.translationService.get("shareTitle"),
                text: this.translationService.get("shareText"),
                url: url
            });
        }
    }

    updateStatus(type, label, content) {

        // Check if we already have a fullfillment status message..
        const fullfillmentStatus = this.donateFieldElem.className === "row fullfilled";
    
        // Only update status if we're not fullfilled..
        if (!fullfillmentStatus) {
          // Set the fieldset type.
          this.donateFieldElem.className = `row ${type}`;
    
          // Hide form and section.
          // TODO God willing: component hide, God willing.
          this.donateFormElem.className = "col s12 m12 l12 hidden";
          electrumSection.className = "col s12 m12 l12 hidden";
          providerSection.className = "col s12 m12 l12 hidden";
    
          // Add status content.
          this.donateStatusElem.setAttribute("data-string", label);
          this.donateStatusElem.innerHTML = content || this.translationService.get(label);
    
          // Show status.
          this.donateStatusElem.className = "col s12 m12 l12";
        }
    }
    
    showPendingStatus(starts, expires) {
        this.updateStatus(null, "statusPending");

        // Automatically update campaign status 500ms after campaign starts.
        const startsInMs = (starts - moment().unix()) * 1000
        setTimeout(this.hideStatus.bind(this, expires), startsInMs + 500);
    }
    
    hideStatus(expires) {
        // Locate the status element.
        // Hide status.
        this.donateStatusElem.className = "col s12 m12 l12 hidden";
        this.donateStatusElem.textContent = "";
        
        // Show the campaign input form.
        this.donateFormElem.className = "col s12 m12 l12";

        // Automatically update campaign status 500ms after campaign ends.
        const endsInMs = (expires - moment().unix()) * 1000
        setTimeout(this.showExpiredStatus.bind(this), endsInMs + 500);
    }

    showExpiredStatus() {
        this.updateStatus(null, "statusExpired")
    }

    showFullfilledStatus(fullfillmentTx) {
        const alreadyFullfilled = this.donateFieldElem.className.indexOf("fullfilled") !== -1;

        if (alreadyFullfilled) {
            return
        }
        
        // Mark the campaign as fullfilled which prevents form entry.
        this.updateStatus("fullfilled", "statusFullfilled");

        // Add interactive content to the status message.
        let sharingActions = `
            <div id="sharingActions" style="font-size: 1rem; opacity: 0.66;">
                ${ typeof navigator.share !== "function" ? "" :
                    `<a id='shareAction' data-string='shareAction'>
                        <i class="icon-share"></i>${this.translationService.get("shareAction")}
                    </a>` 
                }
                <a id='celebrateAction' data-string='celebrateAction'>
                    <i class="icon-nightlife"></i>${this.translationService.get("celebrateAction")}
                </a>
                <a id='fullfillmentLink' target='_blank' href='https://blockchair.com/bitcoin-cash/transaction/${fullfillmentTx}'>
                    <i class="icon-label"></i>${fullfillmentTx}
                </a>
            </div>`;

        this.donateStatus.innerHTML += sharingActions;

        // Make the celebrate action clickable to trigger celebration effects.
        document.getElementById("celebrateAction").addEventListener("click", this.celebration.bind(this, 0.75));
        document.getElementById("shareAction").addEventListener("click", this.shareUrl.bind(this, window.location.href));
    }

    showClaimRewards(rewardUrlTemplate, address) {
        
        //Show the reward link
        if (rewardUrlTemplate && typeof(rewardUrlTemplate) === 'string') {

            const rewardUrl = rewardUrlTemplate.replace("${address}", address)

            this.donateArea.innerHTML += `
            <div id="donateReward" class="col s12 m12 l12" style="text-align: center;">
                <a target="_blank" rel="noopener noreferrer" id="claimRewardLink" href="${DOMPurify.sanitize(rewardUrl)}">Claim your reward</a>
            </div>`
        }
    }

    showParsingContributionStatus() {
        this.updateStatus("pending", "statusParsing");
    }

    showRetryingContributionStatus() {
        this.updateStatus("pending", "statusRetrying");
    }

    showSuccessfulContributionStatus(address) {
        this.updateStatus(null, "statusContribution");    
        this.showClaimRewards(this.campaignService.campaign.rewardUrl, address)
    }

    showContributionInvalidStatus() {
        this.updateStatus("failed", "statusFailedStructure");
    }

    showContributionFailedIntentStatus() {
        this.updateStatus("failed", "statusFailedIntent");
    }

    showContributionFailedStatus(errorMessage) {
        this.updateStatus("failed", "statusFailedUnkown", this.translationService.get("statusFailedUnknown") + `<br/><qoute>${errorMessage}</qoute>`);
    }
}
