// Enable support for Express apps.
const { Hub } = require("@toverux/expresse");

module.exports = (app) => {

    // Create a server-sent event stream.
    const hubs = {}

    app.sse = {
        //Handle requests from server to push to clients
        event: (campaignId, eventName, eventData) => {
            
            if (hubs[campaignId]) {
                hubs[campaignId].event(eventName, eventData)
            }
        },

        getHub: (campaignId) => {
            
            const hub = hubs[campaignId] || new Hub()
            
            //Update app hubs if first hub
            if (!hubs[campaignId]) {
                hubs[campaignId] = hub
            }

            return hub
        }
    }
}