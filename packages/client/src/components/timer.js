// Load the moment library to better manage time.
import moment from "moment"

export default class Timer {
    
    constructor({ labelElem, timerElem }, campaignService, translationService) {
        this.labelElem = labelElem
        this.timerElem = timerElem
        this.campaignService = campaignService
        this.translationService = translationService
    }
    
    //Present in original index.js init function, God bless
    init() {
        const self = this
        let initialized = false

        const campaign = this.campaignService.campaign
        
        if (campaign && campaign.fullfillmentTimestamp) {
            
            self.showFullfilled(campaign.fullfillmentTimestamp);
            return
        }

        if (campaign) {
            initialized = true
            this.updateTimer(this.campaignService.campaign)
        }
                
        this.campaignService.on('update', (campaign) => {
            const isFullfilled = campaign.fullfillmentTimestamp > 0

            if (!initialized && !isFullfilled) {
                initialized = true
                self.updateTimer(campaign)
            }

            if (isFullfilled) {
                self.showFullfilled(campaign.fullfillmentTimestamp);
            }
        })
    }

    updateTimer(campaign) {
        const isFullfilled = campaign.fullfillmentTimestamp > 0
        const hasntStarted = campaign.starts > moment().unix()
        const hasntEnded = campaign.expires > moment().unix()

        // If this campaign has not yet started.
        if (hasntStarted && !isFullfilled) {
            // Change expiration to pending counter.
            this.showPending(campaign.starts, campaign.expires)
        }
        
        if (!hasntStarted && hasntEnded && !isFullfilled) {
            // Change expiration to active campaign counter..
            this.showActive(campaign.expires)
        }

        // If this campaign has already expired.
        if (!hasntStarted && !hasntEnded && !isFullfilled) {
            // Change expiration to already expired counter.
            this.showExpiration(campaign.expires)
        }

        if (isFullfilled) {
            this.showFullfilled(campaign.fullfillmentTimestamp);
        }
    }

    showPending(startsAt, expiresAt) {
        this.labelElem.setAttribute("data-string", "pendingLabel");
        this.labelElem.textContent = this.translationService.get("pendingLabel");

        this.showTimerTo(startsAt)
        
        // Automatically update campaign status 500ms after campaign starts.
        const startsInMs = (startsAt - moment().unix()) * 1000
        setTimeout(this.showActive.bind(this, expiresAt), startsInMs + 500);
    }

    showActive(expiresAt) {
        this.labelElem.setAttribute("data-string", "expiresLabel");
        this.labelElem.textContent = this.translationService.get("expiresLabel");
        
        this.showTimerTo(expiresAt)

        // Automatically update campaign status 500ms after campaign ends.
        const endsInMs = (expiresAt - moment().unix()) * 1000
        setTimeout(this.showExpiration.bind(this, expiresAt), endsInMs + 500);
    }

    showExpiration(expiredAt) {
        this.labelElem.setAttribute("data-string", "expiredLabel");
        this.labelElem.textContent = this.translationService.get("expiredLabel");

        this.showTimerTo(expiredAt)
    }

    showFullfilled(fullfilledAt) {
        // Change expiration to fullfillment counter.
        this.labelElem.setAttribute("data-string", "fullfilledLabel");
        this.labelElem.textContent = this.translationService.get("fullfilledLabel");

        this.showTimerTo(fullfilledAt)
    }

    showTimerTo(to) {
        const setTimer = (() => this.timerElem.textContent = moment().to(moment.unix(to))).bind(this)
        
        setTimer()

        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId)
        }

        // Update the timer every second.
        this.timerIntervalId = setInterval(setTimer, 1000);
    }
}