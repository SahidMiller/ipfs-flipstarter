// Enable support for Express apps.
const express = require("express");
const router = express.Router();
const app = require("../server.js");

const fs = require("fs");
const path = require("path");

const mustache = require("mustache");

// Wrap the campaign request in an async function.
const home = async function (req, res) {
  // Notify the server admin that a campaign has been requested.
  req.app.debug.server("Home page requested from " + req.ip);

  try {

    // Redirect to campaign creation page if no campaign was created
    if (app.freshInstall || app.config.server.redirectHome) {
    
      res.redirect(app.freshInstall ? "/create" : homeRedirect);
    
    } else {

      // Fetch the campaign data.
      const campaign = req.app.queries.getCampaign.get({
        campaign_id: app.config.defaultCampaignId,
      });
      const recipients = req.app.queries.listRecipientsByCampaign.all({
        campaign_id: app.config.defaultCampaignId,
      });

      if (typeof campaign === "undefined") {
        res.status(404).end()
        return
      }

      const clientIndexPage = fs.readFileSync(
        path.join(__dirname, "../node_modules/@ipfs-flipstarter/client/dist/static/templates/index.html"),
        "utf-8"
      )

      const renderedIndexPage = mustache.render(clientIndexPage, { 
        title: campaign.title,
        description: campaign.abstract,
        url: recipients[0].user_url,
        image: recipients[0].user_image
      })

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

  // Fetch the campaign data.
  const campaign = req.app.queries.getCampaign.get({
    campaign_id: app.config.defaultCampaignId,
  });
  const recipients = req.app.queries.listRecipientsByCampaign.all({
    campaign_id: app.config.defaultCampaignId,
  });

  if (typeof campaign === "undefined") {
    res.status(404).end()
    return
  }

  let address = (app.config.server.url || req.get('host')).replace(/\/$/, "")

  if (!address.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
    address = "//" + address
  }

  const result = {
    id: campaign.campaign_id,
    title: campaign.title,
    starts: campaign.starts,
    expires: campaign.expires,
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
        satoshis: recipient.recipient_satoshis,
      }
    }),
    address,
    id: app.config.defaultCampaignId,
    apiType: "https",
    //Get contributions on front-end
    contributions: []
  }

  // Send the payment request data.
  res.status(200).json(result);

  // Notify the server admin that a campaign has been requested.
  req.app.debug.server(
    `Campaign #${req.params["campaign_id"]} data delivered to ` + req.ip
  );
  req.app.debug.object(result);
};

// Call home when this route is requested.
router.get("/", home);

router.get("/campaign.json", campaignInformation)

router.use("/static", express.static(path.join(__dirname, "../node_modules/@ipfs-flipstarter/client/dist/static")));

module.exports = router;
