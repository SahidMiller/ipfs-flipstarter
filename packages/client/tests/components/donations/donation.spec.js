const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const EventEmitter = require('events')
const $ = require('jquery');

const { default: DonationInput } = require('../../../src/components/donations');

const { readFileSync } = require('fs');
const moment = require('moment');

jest.mock('../../../src/utils/rates')

const { loadCurrencyRates } = require('../../../src/utils/rates')

describe("donations input", () => {
    
    const testHttpCampaign = {
        "contributions": [],
        "recipients":[{
            "name":"Test",
            "url":"https://www.test.com",
            "image":"https://navbar.cloud.bitcoin.com/images/logo_black.png",
            "address":"bchtest:qqekcwxmfzhgn775r6t382g08mx4cxclfsd2d2v0x0",
            "signature":null,
            "satoshis":1000
        }]
    }

    test("shows pending status and hide donation, then reveal and hide status, then hide and reveal expiration status", async () => {
        document.querySelector('html').innerHTML = readFileSync('./packages/client/tests/assets/donation-fixture.html', 'utf8')

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            ...testHttpCampaign,
            "starts": moment().add(1, 'seconds').unix(),
            "expires": moment().add(3, 'seconds').unix()
        }

        campaignService.subscribe = (cb) => {
            campaignService.on("update", cb)
            cb(campaignService.campaign)
        }

        const donationService = new EventEmitter()
        donationService.updateAmount = jest.fn()

        const expectedNotStartedStatus = "Campaign has not started yet"
        const expectedHasExpiredStatus = "Campaign has expired"
        const translationService = {
            get: jest.fn().mockImplementation((key) => {
                if (key === "statusPending") {
                    return expectedNotStartedStatus
                }

                if (key === "statusExpired") {
                    return expectedHasExpiredStatus
                }
            }),
            languageCode: "en",
            on: () => {}
        }

        loadCurrencyRates.mockResolvedValue([{ code: "en", rate: 5 }])

        new DonationInput({
            donateArea: document.getElementById("donateArea"),
            donateStatus: document.getElementById("donateStatus"),
            donateFormContainer: document.getElementById("donateFormContainer"),
            donateSlider: document.getElementById("donationSlider"),
            donateButton: document.getElementById("donateButton"),
            donateText: document.getElementById("donateText"),
            donateAmount: document.getElementById("donateAmount"),
            contributionBar: document.getElementById("campaignContributionBar"),
            
            contributionName: document.getElementById("contributionName"),
            contributionComment: document.getElementById("contributionComment"),
                       
            electrumSection: document.getElementById("electrumSection"),
            providerSection: document.getElementById("providerSection")

        }, campaignService, translationService, donationService).init()
        
        expect($("#donateStatus").text()).toEqual(expectedNotStartedStatus)
        expect($("#donateFormContainer").hasClass("hidden")).toBeTruthy()
        
        await new Promise(res => setTimeout(res, 2000))

        expect($("#donateStatus").text()).toEqual("")
        expect($("#donateFormContainer").hasClass("hidden")).toBeFalsy()

        await new Promise(res => setTimeout(res, 2000))

        expect($("#donateStatus").text()).toEqual(expectedHasExpiredStatus)
        expect($("#donateFormContainer").hasClass("hidden")).toBeTruthy()
    })

    test("reveals donate section", async () => {
        document.querySelector('html').innerHTML = readFileSync('./packages/client/tests/assets/donation-fixture.html', 'utf8')

        const campaignService = new EventEmitter()

        campaignService.subscribe = (cb) => {
            campaignService.on("update", cb)
            cb(campaignService.campaign)
        }

        campaignService.campaign = {
            ...testHttpCampaign,
            "starts": moment().subtract(15, 'days').unix(),
            "expires": moment().add(3, 'days').unix()
        }

        const expectedNotStartedStatus = "Campaign has not started yet"
        const expectedHasExpiredStatus = "Campaign has expired"
        const translationService = {
            get: jest.fn().mockImplementation((key) => {
                if (key === "statusPending") {
                    return expectedNotStartedStatus
                }

                if (key === "statusExpired") {
                    return expectedHasExpiredStatus
                }
            }),
            languageCode: "en",
            on: () => {}
        }

        const donationService = new EventEmitter()
        donationService.updateAmount = jest.fn()

        loadCurrencyRates.mockResolvedValue([{ code: "en", rate: 5 }])

        new DonationInput({
            donateArea: document.getElementById("donateArea"),
            donateStatus: document.getElementById("donateStatus"),
            donateFormContainer: document.getElementById("donateFormContainer"),
            donateSlider: document.getElementById("donationSlider"),
            donateButton: document.getElementById("donateButton"),
            donateText: document.getElementById("donateText"),
            donateAmount: document.getElementById("donateAmount"),
            contributionBar: document.getElementById("campaignContributionBar"),
            
            contributionName: document.getElementById("contributionName"),
            contributionComment: document.getElementById("contributionComment"),
                       
            electrumSection: document.getElementById("electrumSection"),
            providerSection: document.getElementById("providerSection"),


        }, campaignService, translationService, donationService).init()
        
        expect($("#providerSection").hasClass("hidden")).toBeTruthy()

        document.getElementById("donationSlider").value = .8
        document.getElementById("donationSlider").dispatchEvent(new Event("input"));
        document.getElementById("donateButton").dispatchEvent(new Event("click"))

        expect($("#providerSection").hasClass("hidden")).toBeFalsy()
        //expect($("#donateAmount")).toEqual("")
    })
})