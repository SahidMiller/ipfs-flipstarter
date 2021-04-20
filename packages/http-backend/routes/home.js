// Enable support for Express apps.
const express = require("express");
const router = express.Router();
const app = require("../server.js");

const fs = require("fs");
const path = require("path");

const { createFlipstarterClientHtml } = require("@ipfs-flipstarter/utils");
const clientRoot = path.dirname(require.resolve("@ipfs-flipstarter/client/package.json"))

// Wrap the campaign request in an async function.
const home = async function (req, res) {
  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Home page requested from " + req.ip);

  try {

    // Redirect to campaign creation page if no campaign was created
    // Redirect to configured url if set
    if (app.freshInstall || app.config.server.redirectHomeUrl) {
    
      res.redirect(app.freshInstall ? "/create" : app.config.server.redirectHomeUrl);
    
    // If campaign is created and no url redirect configured, route to ipfs-flipstarter client
    } else {

      // Fetch the campaign data.
      const campaign = getCampaign(req)

      if (typeof campaign === "undefined") {
        res.status(404).end()
        return
      }

      const clientIndexPageTemplate = fs.readFileSync(path.join(clientRoot, "/public/static/templates/index.html"), "utf-8")
      const renderedIndexPage = await createFlipstarterClientHtml(clientIndexPageTemplate, campaign)

      res.write(renderedIndexPage)
      res.end()
    }
    
    // Notify the server admin that a campaign has been requested.
    req.app.debug.server("Home page delivered to " + req.ip);
  } catch (err) {
    req.app.debug.server(err)
    return res.status(400).end()
  }
};

// Wrap the campaign request in an async function.
const campaignInformation = async function (req, res) {

  const campaign = getCampaign(req);

  if (typeof campaign === "undefined") {
    res.status(404).end()
    return
  }

  // Send the payment request data.
  res.status(200).json(campaign);

  // Notify the server admin that a campaign has been requested.
  req.app.debug.server(
    `Campaign #${app.config.defaultCampaignId} data delivered to ` + req.ip
  );
  req.app.debug.object(campaign);
};

function getCampaign(req) {
  
  // Fetch the campaign data.
  const campaign = req.app.queries.getCampaign.get({
    campaign_id: app.config.defaultCampaignId,
  });
  const recipients = req.app.queries.listRecipientsByCampaign.all({
    campaign_id: app.config.defaultCampaignId,
  });

  if (typeof campaign === "undefined") {
    return
  }

  let address = (app.config.server.url || req.get('host')).replace(/\/$/, "")

  if (!address.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
    address = "//" + address
  }

  //TODO God willing: on first run, we can hash this and combine with build-time dag nodes to generate a url, God willing.
  return {
    id: campaign.campaign_id,
    title: campaign.title,
    starts: Number(campaign.starts),
    expires: Number(campaign.expires),
    rewardUrl: campaign.reward_url,
    descriptions: {
      en: { abstract: campaign.abstract, proposal: campaign.proposal },
      es: { abstract: campaign.abstractES, proposal: campaign.proposalES },
      zh: { abstract: campaign.abstractZH, proposal: campaign.proposalZH },
      ja: { abstract: campaign.abstractJA, proposal: campaign.proposalJA }
    },
    recipients: recipients.map(recipient => {
      return {
        name: recipient.user_alias,
        url: recipient.user_url,
        image: recipient.user_image,
        address: recipient.user_address,
        signature: null,
        satoshis: Number(recipient.recipient_satoshis),
      }
    }),
    address,
    id: app.config.defaultCampaignId,
    apiType: "https",
    //Get contributions on front-end
    contributions: []
  }
}

// Call home when this route is requested.
router.get("/", home);

router.get("/campaign.json", campaignInformation)

if (!app.config.server.redirectHomeUrl) {
  router.use("/static", express.static(path.join(clientRoot, "/public/static")));
}

module.exports = router;
