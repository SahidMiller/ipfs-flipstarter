import moment from "moment"
// Load the celebratory confetti library.
import confetti from "canvas-confetti"

export default class Celebration {
    constructor({ applause }, campaignService) {
        this.applauseElem = applause
        this.campaignService = campaignService
    }

    init() {
        let initialTimestamp = moment().unix()

        this.campaignService.on("update", (campaign) => {

            if (campaign.fullfilled && campaign.fullfillmentTimestamp >= initialTimestamp) {
                initialTimestamp = campaign.fullfillmentTimestamp
                this.celebrate()
            }
        })
    }

    // Function that can be used to cause celebratory effects.
    celebrate(volume = 0.11) {

        // Let the confetti burst in like fireworks!
        let fireworks = function () {
            // Left side of the screen.
            const leftConfetti = {
                particleCount: 50,
                angle: 60,
                spread: 90,
                origin: { x: 0 },
            };
        
            // Right side of the screen.
            const rightConfetti = {
                particleCount: 50,
                angle: 120,
                spread: 90,
                origin: { x: 1 },
            };
        
            // Trigger the confetti.
            confetti(leftConfetti);
            confetti(rightConfetti);
        };
    
        // Adjust volume to prevent heartattacks.
        this.applauseElem.volume = volume;
    
        // NOTE: https://gitlab.com/flipstarter/frontend/-/issues/64
        // Wrap audio play function in try-catch clause to prevent
        // abrupt halt of execution in case user has not yet interacted.
        try {
            // Play the sound effect.
            this.applauseElem.play();
        } catch (error) {
            // Do nothing.
        }
    
        // Burst multiple times with some delay.
        window.setTimeout(fireworks, 100);
        window.setTimeout(fireworks, 200);
        window.setTimeout(fireworks, 400);
        window.setTimeout(fireworks, 500);
        window.setTimeout(fireworks, 700);
    }
}