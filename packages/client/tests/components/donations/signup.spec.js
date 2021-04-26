const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const EventEmitter = require('events')
const { default: SignupDonation } = require('../../../src/components/donations/signup');

const $ = require('jquery');

describe("signup donations", () => {
    
    const testHttpCampaign = {
    }

    test("calls signup provider and accepts contribution", () => {
        document.querySelector('html').innerHTML = `
        <button id="signupDonateButton">
            <span>Contribute using SignUp</span>
        </button>`

        const campaignService = new EventEmitter()

        campaignService.campaign = testHttpCampaign

        new SignupDonation({
            signupButton: document.getElementById("signupDonateButton")
        }, campaignService).init()

        //expect($("#").text()).toEqual()
    })
})