import { Buffer } from 'buffer'

export default class ElectrumDonation {
    constructor({ 
        template, 
        copyTemplateBtn, 
        commitTransaction, 
        commitment,
    }, donationService) {
                
        this.donationService = donationService

        this.commitmentRequestPayload = template
        this.copyCommitmentRequestButton = copyTemplateBtn
        this.commitTransactionButton = commitTransaction
        this.commitmentResult = commitment
    }

    init() {

        this.commitmentRequestPayload.addEventListener("click", this.copyTemplate.bind(this));
        this.copyCommitmentRequestButton.addEventListener("click", this.copyTemplate.bind(this));

        this.commitmentResult.addEventListener("change", this.updateCommitButton.bind(this));
        this.commitmentResult.addEventListener("keyup", this.updateCommitButton.bind(this));

        this.commitmentResult.addEventListener("onpaste", this.updateCommitButton.bind(this));
        this.commitmentResult.addEventListener("oninput", this.updateCommitButton.bind(this));

        this.commitTransactionButton.addEventListener("click", () => {
            this.donationService.commit(this.commitmentResult.value)
        });

        this.donationService.on("update", this.updateTemplate.bind(this))
    }

    async updateCommitButton() {
        
        if (!this.commitmentResult || !this.commitmentRequestPayload) {
            return
        }
            
        let isDuplicated = this.commitmentResult.value === this.commitmentRequestPayload.value
        
        if (isDuplicated) {
    
            this.commitmentResult.style.outline = "2px dotted red";
            this.commitmentRequestPayload.style.outline = "2px dotted red";
    
        } else {

            this.commitmentResult.style.outline = "none";
            this.commitmentRequestPayload.style.outline = "none";
        }

        if (this.commitTransactionButton) {
            
            this.commitTransactionButton.disabled = 
                isDuplicated ||         // Keep the button disabled as this is not a valid pledge.
                this.commitmentResult.value === "" // Enable the button if there is content in the pledge textarea.
        }
    }
    
    //TODO God willing: update to minimum satoshis for campaign
    async updateTemplate({ name = "", comment = "", satoshis = 0 }) {

        if (this.copyCommitmentRequestButton) {

            this.copyCommitmentRequestButton.textContent = this.translationService.get("copyButton");
            this.copyCommitmentRequestButton.disabled = null;
        }

        let requestPayload = ""

        // If the user wants to donate some satoshis..
        if (satoshis) {

            // Assemble the request object.
            let requestObject = {
                outputs: [],
                data: {
                    alias: name,
                    comment: comment,
                },
                donation: {
                    amount: Number(satoshis),
                },
                expires: this.campaign.expires
            };
    
            // For each recipient..
            for (const recipientIndex in this.campaign.recipients) {
                const outputValue = this.campaign.recipients[recipientIndex].satoshis;
                const outputAddress = this.campaign.recipients[recipientIndex].address;
        
                // Add the recipients outputs to the request.
                requestObject.outputs.push({ value: outputValue, address: outputAddress });
            }
    
            // Assemble an assurance request template.
            // Update the website template string.
            requestPayload = Buffer.from(JSON.stringify(requestObject), "utf8").toString('base64');
        }

        if (this.commitmentRequestPayload) {

            this.commitmentRequestPayload = requestPayload
        }
    }

    async copyTemplate() {
        
        this.donationService.ready("electrum")

        if (this.commitmentRequestPayload) {
            // Select the template text.
            this.commitmentRequestPayload.select();
            this.commitmentRequestPayload.setSelectionRange(0, 99999);
        
            // Copy the selection to the clipboard.
            document.execCommand("copy");
            
            // Deselect the text.
            this.commitmentRequestPayload.setSelectionRange(0, 0);
        }

        if (this.copyCommitmentRequestButton) {
            // Notify user that the template has been copied by changing the button appearance..
            this.copyCommitmentRequestButton.textContent = "Done";
            this.copyCommitmentRequestButton.disabled = "disabled";
        }
    }
}