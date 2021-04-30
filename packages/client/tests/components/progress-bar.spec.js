const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
const EventEmitter = require('events')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const { default: ProgressBar } = require('../../src/components/progress-bar')

describe("progress bar", () => {
    
    const testHttpCampaign = {
        recipients: [{
            satoshis: 1000
        }],
        contributions: [],
        commitmentCount: 0,
        committedSatoshis: 0,
        requestedSatoshis: 1000,
        minerFee: 79
    }

    test("starts bar at 0% with no contributions and increase to next when contribution is accepted", () => {
        document.querySelector('html').innerHTML = `
        <div>
            <span>
                <span id="campaignContributionAmount">0.00</span>
                <span id="campaignRequestAmount">{{ requestedAmount }}</span>
                <b>BCH</b>
            </span>
        </div>
        <div>
            <div id="campaignProgressBar"></div>
            <div id="campaignContributionBar"></div>
        </div>`

        const $ = require('jquery');

        //Run src file
        const campaignService = new EventEmitter()
        campaignService.campaign = testHttpCampaign
        campaignService.getCampaign = jest.fn().mockImplementation(() => campaignService.campaign)
        
        campaignService.subscribe = (cb) => {
            campaignService.on("update", cb)
            cb(campaignService.campaign)
        }

        const donationService = new EventEmitter()

        new ProgressBar({
            campaignRequestAmount: document.getElementById("campaignRequestAmount"),
            campaignContributionAmount: document.getElementById("campaignContributionAmount"),
            campaignContributionBar: document.getElementById("campaignContributionBar"),
            campaignProgressBar: document.getElementById("campaignProgressBar")
        }, campaignService, donationService).init()
        
        expect($("#campaignContributionAmount").text()).toEqual("0.00000000")
        expect($("#campaignRequestAmount").text()).toEqual("0.00001079")
        expect($("#campaignProgressBar")[0].style.width).toEqual("0.00%")

        campaignService.campaign = { 
            ...testHttpCampaign,
            contributions: [{ satoshis: 500 }],
            commitmentCount: 1,
            committedSatoshis: 500
        }

        campaignService.emit('update', campaignService.campaign)

        expect($("#campaignContributionAmount").text()).toEqual("0.00000500")
        expect($("#campaignRequestAmount").text()).toEqual("0.00001079")
        expect($("#campaignProgressBar")[0].style.width).toEqual(
            ((.00000500 / .00001079) * 100).toFixed(2) + "%")
        expect($("#campaignContributionBar")[0].style.left).toEqual(
            ((.00000500 / .00001079) * 100).toFixed(2) + "%")
        expect($("#campaignContributionBar")[0].style.width).toEqual("")

        donationService.emit("update", { satoshis: (1079 - 500) * .1 })

        expect($("#campaignContributionAmount").text()).toEqual("0.00000500")
        expect($("#campaignRequestAmount").text()).toEqual("0.00001079")
        expect($("#campaignProgressBar")[0].style.width).toEqual(
            ((.00000500 / .00001079) * 100).toFixed(2) + "%")
        expect($("#campaignContributionBar")[0].style.left).toEqual(
            ((.00000500 / .00001079) * 100).toFixed(2) + "%")
        
        //Get percent of what's been completed and get what's leftover
        //and take 10 percent of that, God willing. Then convert to percentage.
        const percentOfLeftover = (1 - (500 / 1079)) * .10
        expect($("#campaignContributionBar")[0].style.width).toEqual(
            (percentOfLeftover * 100).toFixed(2) + "%")
    })

    test("starts bar at 0% with no contributions and increase to next when contribution is accepted", () => {
        document.querySelector('html').innerHTML = `
        <div>
            <span>
                <span id="campaignContributionAmount">0.00</span>
                <span id="campaignRequestAmount">{{ requestedAmount }}</span>
                <b>BCH</b>
            </span>
        </div>
        <div>
            <div id="campaignProgressBar"></div>
            <div id="campaignContributionBar"></div>
        </div>`

        const $ = require('jquery');

        //Run src file
        const campaignService = new EventEmitter()
        
        campaignService.subscribe = (cb) => {
            campaignService.on("update", cb)
        }

        const donationService = new EventEmitter()

        new ProgressBar({
            campaignRequestAmount: document.getElementById("campaignRequestAmount"),
            campaignContributionAmount: document.getElementById("campaignContributionAmount"),
            campaignContributionBar: document.getElementById("campaignContributionBar"),
            campaignProgressBar: document.getElementById("campaignProgressBar")
        }, campaignService, donationService).init()
        
        expect($("#campaignContributionAmount").text()).toEqual("0.00")
        expect($("#campaignRequestAmount").text()).toEqual("")
        expect($("#campaignProgressBar")[0].style.width).toEqual("")

        campaignService.emit('update', testHttpCampaign)

        expect($("#campaignContributionAmount").text()).toEqual("0.00000000")
        expect($("#campaignRequestAmount").text()).toEqual("0.00001079")
        expect($("#campaignProgressBar")[0].style.width).toEqual("0.00%")
    })
})