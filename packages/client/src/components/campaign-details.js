export default class CampaignDetails {

    constructor({
        campaignAbstract,
        campaignDetails
    }, campaignService) {
        this.campaignAbstract = campaignAbstract || document.getElementById("campaignAbstract")
        this.campaignDetails = campaignDetails || document.getElementById("campaignDetails")

        this.campaignService = campaignService
    }
    
    init() {

        this.languageService.on('update', (languageCode) => {
            
            // Print out the campaign texts.
            const campaign = this.campaignService && this.campaignService.campaign
            const { abstract = "", proposal = "" } = (campaign && campaign.descriptions || {})[languageCode]

            if (this.campaignAbstract && abstract) {
                this.campaignAbstract.innerHTML = DOMPurify.sanitize(await markdownParser(abstract));
            }

            if (this.campaignDetails && proposal) {
                this.campaignDetails.innerHTML = DOMPurify.sanitize(await markdownParser(proposal));
            }

            //TODO God willing: find better way to remove ugly disabled css
            document.querySelectorAll(".task-list-item input[checked]").forEach(i => i.disabled = false)
        })
    }
}