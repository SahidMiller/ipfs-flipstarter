const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
const EventEmitter = require('events');

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const $ = require('jquery');
const { default: RecipientList } = require('../../src/components/recipients');
const { SATS_PER_BCH } = require('@ipfs-flipstarter/utils/bitcoinCashUtilities');

describe("recipient list", () => {
    
    const testHttpCampaign = {
        "recipients":[{
            "name":"Test",
            "url":"https://www.test.com",
            "image":"https://navbar.cloud.bitcoin.com/images/logo_black.png",
            "address":"bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0",
            "signature":null,
            "satoshis":1000
        }]
    }

    test("shows satoshis in bch", () => {
        document.querySelector('html').innerHTML = `
        <section>
            <h3>
                <b id="campaignRecipientCount">{{ recipientCount }}</b>
                <span data-string="recipientsLabel">{{ recipientsLabel }}</span>
            </h3>
            <hr>
            <ul id="recipientList">
            </ul>
        </section>`


        const campaignService = new EventEmitter()

        campaignService.campaign = testHttpCampaign

        new RecipientList({
            recipientCount: document.getElementById("campaignRecipientCount"),
            recipientList: document.getElementById("recipientList")
        }, campaignService).init()

        const recipientElems = $("#recipientList li")
        const recipientElemsCount = recipientElems.length
        const recipientAmount = recipientElems.find(".amountInBch").text().trim()

        expect(recipientElemsCount).toEqual(testHttpCampaign.recipients.length)
        
        const expectedAmountInBch = testHttpCampaign.recipients[0].satoshis / SATS_PER_BCH
        const expectedAmount = Number(expectedAmountInBch) + " BCH"
        expect(recipientAmount).toEqual(expectedAmount)

        expect($("#campaignRecipientCount").text()).toEqual(testHttpCampaign.recipients.length.toString())
    })
})