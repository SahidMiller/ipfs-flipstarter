const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util')
const EventEmitter = require('events')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const CampaignService = require('../../src/services/campaign').default
const { HttpServerConnector } = require('../../src/server-connector')

jest.mock('../../src/server-connector')
jest.mock('../../src/server-ipfs-connector')

describe("campaign service", () => {

    const testHttpCampaign = {
        "title":"Interplanetary Flipstarters",
        "starts": 1615266000,
        "expires": 1617949600,
        "recipients":[{
            "name":"Test",
            "url":"https://www.test.com",
            "image":"https://navbar.cloud.bitcoin.com/images/logo_black.png",
            "address":"bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0",
            "signature":null,
            "satoshis":1000
        }],
        "contributions":[],
        "fullfilled":false,
        "fullfillmentTx":null,
        "fullfillmentTimestamp":null,
        "descriptions":{
            "en": { "abstract": "", "proposal": "" },
            "es": { "abstract":"", "proposal":"" },
            "zh": { "abstract":"", "proposal":"" },
            "ja": { "abstract":"", "proposal":"" }
        },
        "apiType":"https",
        "id":1,
        "address":"http://localhost:3000",
        "rewardUrl": "https://ipfs.io/ipfs/Qm123?api_url=http://localhost:3000&api_type=https&recipients[][address]=${address}"
    }

    const expectedCampaignDetails = {
        requestedSatoshis: 1000,
        minerFee: 79
    }

    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        HttpServerConnector.mockClear();
    });

    test("should fetch campaign json", async () => {

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(testHttpCampaign),
            })
        );

        //Run campaign service
        const campaignService = new CampaignService()
        const campaign = await campaignService.init()
        
        expect(global.fetch).toHaveBeenCalledWith("campaign.json")

        //Expect campaign to contain information in json file
        expect(campaign).toEqual(expect.objectContaining(testHttpCampaign))
        expect(campaign.requestedSatoshis).toEqual(expectedCampaignDetails.requestedSatoshis)
        expect(campaign.minerFee).toEqual(expectedCampaignDetails.minerFee)
    })

    test("should call http-connector for https apiType", async () => {

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(testHttpCampaign),
            })
        );

        //Run campaign service
        const campaignService = new CampaignService()
        campaignService.emit = jest.fn()
        
        await campaignService.init()
        
        expect(HttpServerConnector).toHaveBeenCalled()
        
        const mockServer = HttpServerConnector.mock.instances[0]
        expect(mockServer.listen).toHaveBeenCalled()

        expect(campaignService.emit).toHaveBeenCalledWith('update', expect.objectContaining(testHttpCampaign))
    })
    
    test("should call ipfs-connector for ipfs apiType", async () => {
        const testIpfsCampaign = { ...testHttpCampaign, apiType: "ipfs" }
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(testIpfsCampaign),
            })
        );

        //Run src file
        const campaignService = new CampaignService()
        await campaignService.init()
        
        expect(HttpServerConnector).not.toHaveBeenCalled()
    })

    test("campaign service updates when server updates", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(testHttpCampaign),
            })
        );

        //Run src file
        const campaignService = new CampaignService()
        campaignService.emit = jest.fn()
        
        HttpServerConnector.mockReset()
        HttpServerConnector.mockImplementation(() => {
            const ee = new EventEmitter()
            ee.listen = jest.fn()
            return ee
        })
        
        const test = jest.fn()
        await campaignService.init(test)

        expect(campaignService.emit).toHaveBeenCalledTimes(1)
        expect(campaignService.emit).toHaveBeenLastCalledWith('update', expect.objectContaining(testHttpCampaign))

        const testUpdateCampaign = { ...testHttpCampaign, contributions: [{ id: 1 }]}

        campaignService.server.emit('update', testUpdateCampaign)
        
        expect(campaignService.emit).toHaveBeenCalledTimes(2)
        expect(campaignService.emit).toHaveBeenLastCalledWith('update', expect.objectContaining(testUpdateCampaign))
    })
})