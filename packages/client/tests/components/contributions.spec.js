const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
const EventEmitter = require('events')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const { default: ContributionsList } = require('../../src/components/contributions');

const $ = require('jquery');
const { SATS_PER_BCH, calculateTotalContributorMinerFees } = require('@ipfs-flipstarter/utils/bitcoinCashUtilities');

describe("contributions", () => {
    
    const testHttpCampaign = {
        "recipients":[{
            "name":"Test",
            "url":"https://www.test.com",
            "image":"https://navbar.cloud.bitcoin.com/images/logo_black.png",
            "address":"bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0",
            "signature":null,
            "satoshis":1000
        }],
        requestedSatoshis: 1000
    }

    test("shows empty contributions message and update with incoming contributions", () => {
        const expectedEmptyMessage = "Empty"
        document.querySelector('html').innerHTML = `                        
        <section>
            <h3>
                <span>
                <i class="icon-favorite_border"></i>
                <b id="campaignContributorCount">0</b>
                <span data-string="contributorsLabel">{{ contributorsLabel }}</span>
                </span>
            </h3>
            <hr>
            <ul id="contributionList">
                <li>
                    <i data-string="contributorEmpty1"></i>
                    <br>
                    <i data-string="contributorEmpty2"></i>
                </li>
            </ul>
        </section>
        <template id="contributionTemplate">
            <li>
                <div>
                    <div class="contributionWaves"></div>
                    <div class="contributionDisplay"></div>
                    <span class="contributionPercent"></span>
                </div>
                <span>
                    <span>
                        <b class="contributionAlias"></b>
                        <small class="contributionAmount"></small>
                    </span>
                    <q class="contributionComment"></q>
                </span>
            </li>
        </template>
        <template id="emptyContributionMessage">
            <li>
                <i data-string="contributorEmpty1">${expectedEmptyMessage}</i>
                <br>
                <i data-string="contributorEmpty2">${expectedEmptyMessage}</i>
            </li>
        </template>
        `


        const campaignService = new EventEmitter()
        campaignService.campaign = {
            ...testHttpCampaign,
            commitmentCount: 0
        }

        new ContributionsList({
            contributionCount: document.getElementById("campaignContributorCount"),
            contributionsList: document.getElementById("contributionList"),
            
            //TODO God willing: handle different types of inputs? like html too.
            emptyContributionsTemplate: document.getElementById("emptyContributionMessage"),
            contributionTemplate: document.getElementById("contributionTemplate")
        }, campaignService).init()

        expect($("#contributionList > li").eq(0).text().replace(/\s*/g, "")).toEqual(expectedEmptyMessage + expectedEmptyMessage)

        campaignService.emit('update', { ...testHttpCampaign, contributions: [{ alias: "Test", comment: "test", satoshis: 900 }], committedSatoshis: 900, commitmentCount: 1 })
        
        const expectedSent = 900 - calculateTotalContributorMinerFees(1, campaignService.targetFeeRate)
        const expectedPercent =  Math.floor((expectedSent / testHttpCampaign.requestedSatoshis) * 100)
        
        expect($("#contributionList").text().replace(/\s*/g, "")).toEqual(expectedPercent + "%Test" + expectedSent / SATS_PER_BCH + "BCHtest")

        campaignService.emit('update', { 
            ...testHttpCampaign, 
            contributions: [{ alias: "Test", comment: "test", satoshis: 500 }, { satoshis: 500 }], 
            committedSatoshis: 1000, 
            commitmentCount: 2 
        })

        expect($("#contributionList > li").length).toEqual(2)
    })
})