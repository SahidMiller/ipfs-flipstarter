const { cid: FLIPSTARTER_CREATE_CID, dag: FLIPSTARTER_CREATE_DAG } = require("@ipfs-flipstarter/create")

module.exports = async function initializeConfig(app) {
  const defaultGatewayUrl = process.env.DEFAULT_GATEWAY_URL || "https://ipfs.io"
  
  app.config = {
    //
    initialCampaignJsonPath: process.env.FLIPSTARTER_CAMPAIGN_JSON,
    defaultCampaignId: process.env.FLIPSTARTER_DEFAULT_CAMPAIGN_ID || 1,
    server: {
      // Which port the server should listen for requests on.
      port: process.env.PORT || 3000,
      env: process.env.NODE_ENV || "production",
      // Where to store the servers database file(s).
      database: process.env.FLIPSTARTER_DB || "./static/campaigns/database.db",
      url: process.env.FLIPSTARTER_API_URL,

      redirectHomeUrl: process.env.FLIPSTARTER_API_REDIRECT_HOME_URL,
      redirectCreateUrlBase: process.env.FLIPSTARTER_API_REDIRECT_CREATE_URL ||
        defaultGatewayUrl + "/ipfs/" + FLIPSTARTER_CREATE_CID,
    },
    bch: {
      network: process.env.NODE_ENV === "development" ? "testnet" : "mainnet",
      targetFeeRate: process.env.FLIPSTARTER_TARGET_FEE_RATE || 1,
    },
    auth: {
      type: process.env.FLIPSTARTER_API_AUTH || "pending-contributions",
      validAuthCampaigns: process.env.FLIPSTARTER_API_AUTH_CAMPAIGNS ? JSON.parse(process.env.FLIPSTARTER_API_AUTH_CAMPAIGNS) : [1]
    },
    ipfs: {
      defaultGatewayUrl
    }
  }
};