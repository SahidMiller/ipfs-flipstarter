const config = {
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

    redirectHome: process.env.FLIPSTARTER_API_REDIRECT_HOME_URL,
    redirectCreate: process.env.FLIPSTARTER_API_REDIRECT_CREATE_URL,
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
    gatewayUrl: (process.env.FLIPSTARTER_IPFS_GATEWAY_URL || "https://ipfs.io").replace(/\/$/, ""),
    createCid: process.env.FLIPSTARTER_CREATE_CID
  }
}

//Add generic protocol to gateway url if missing http or https
if (!config.ipfs.gatewayUrl.match(/^(http:\/\/|https:\/\/|\/\/)/)) {
  config.ipfs.gatewayUrl = "//" + config.ipfs.gatewayUrl
}

if (!config.server.redirectCreate && config.ipfs.createCid) {
  //TODO God willing: fail if no cid or redirect url is passed, God willing.
  config.ipfs.redirectCreate = `${config.ipfs.gatewayUrl}/ipfs/${config.ipfs.createCid}`
}

module.exports = config;