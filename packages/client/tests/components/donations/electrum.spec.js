const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const EventEmitter = require('events')

describe("electrum donations", () => {
    const { default: ElectrumDonation } = require('../../../src/components/donations/electrum');

    const testHttpCampaign = {
    }

    test("calls signup provider and accepts contribution", () => {
        document.querySelector('html').innerHTML = `
        <div>
            <input id="contributionName" type="text" maxlength="24">
        </div>
        <div>
            <input id="contributionComment" type="text" maxlength="120">
        </div>


        <button id="electrumDonateButton">
            <span>Contribute using Electrum</span>
        </button>
        <div id="electrumSection" class="hidden">
            <div>
                <div>
                    <small data-string="copyLabel"></small>
                    <textarea rows="5" id="template" name="template"></textarea>
                    <button id="copyTemplateButton" data-string="copyButton"></button>
                </div>
            </div>
            <div>
                <small data-string="commitLabel"></small>
                <textarea rows="5" id="commitment" name="commitment" data-placeholder="PasteHere"></textarea>
                <button id="commitTransaction" disabled="disabled" data-string="commitButton"></button>
            </div>
        </div>`

        const campaignService = new EventEmitter()

        campaignService.campaign = testHttpCampaign
        campaignService.subscribe = (cb) => {
            campaignService.on("update", cb)
            cb(campaignService.campaign)
        }

        const donationService = new EventEmitter()

        new ElectrumDonation({
            contributionName: document.getElementById("contributionName"),
            contributionComment: document.getElementById("contributionComment"),
            template: document.getElementById("template"),
            copyTemplateBtn: document.getElementById("copyTemplateButton"),
            commitTransaction: document.getElementById("commitTransaction"),
            commitment: document.getElementById("commitment"),
        }, campaignService, donationService).init()

        //expect($("#").text()).toEqual()
    })
})