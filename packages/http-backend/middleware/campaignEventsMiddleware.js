const { compose } = require('compose-middleware')
const { sse, Hub } = require("@toverux/expresse")

module.exports = function () {
        
    function middleware(req, res, next) {
        
        let campaign  

        //Fetch the campaign data.
        const campaignId = req.params["campaign_id"]
        
        if (campaignId){
            
            campaign = req.app.queries.getCampaign.get({
                campaign_id: campaignId
            });
        }
        
        //Don't return a hub if the campaign doesn't exist
        if (typeof campaign === "undefined") {
            res.status(404).end()
            return
        }

        //Create new hub for campaign if first request
        const hub = req.app.sse.getHub(campaignId)

        //=> Register the SSE functions of that client on the hub
        hub.register(res.sse);

        //=> Unregister the user from the hub when its connection gets closed (close=client, finish=server)
        res.once('close', () => hub.unregister(res.sse));
        res.once('finish', () => hub.unregister(res.sse));

        //=> Make hub's functions available on the response
        res.sse.broadcast = {
            data: hub.data.bind(hub),
            event: hub.event.bind(hub),
            comment: hub.comment.bind(hub),
        };

        //=> Done
        next();
    }

    return compose(sse(), middleware);
}