const express = require("express")
const router = express.Router();

// Add support for event source
const campaignEventsMiddleware = require("../middleware/campaignEventsMiddleware")

const initEvents = function(req, res) {
       
    // Fetch the campaign data.
    const campaign = req.app.queries.getCampaign.get({
        campaign_id: req.params["campaign_id"],
    });

    const campaignContributions = req.app.queries.listContributionsByCampaign.all({ 
        campaign_id: req.params["campaign_id"]
    }).filter(c => !c.revocation_id || (campaign.fullfillment_timestamp && c.revocation_timestamp > campaign.fullfillment_timestamp))

    res.sse.event("init", { ...campaign, id: campaign.campaign_id, contributions: campaignContributions })
}

router.get("/:campaign_id/", campaignEventsMiddleware(), initEvents)

module.exports = router