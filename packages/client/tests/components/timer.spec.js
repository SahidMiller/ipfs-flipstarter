const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util')
const EventEmitter = require('events')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const $ = require('jquery');
const { default: Timer } = require('../../src/components/timer');
const moment = require('moment');

describe("timer", () => {
    
    test("shows starts in x days if campaign hasn't started", async () => {

        document.querySelector('html').innerHTML = `
        <span>
            <span id="timerLabel" data-string="expiresLabel">{{ timerLabel }}</span>
            <b id="campaignExpiration">{{ timerDaysUntil }}</b>
        </span>`

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            starts: moment().add(1, 'seconds').unix(),
            expires: moment().add(3, 'seconds').unix()
        }

        const translationService = {
            get: jest.fn()
        }

        translationService.get.mockReturnValueOnce("Starts");

        new Timer({
            labelElem: document.querySelector("#timerLabel"),
            timerElem: document.querySelector("#campaignExpiration")
        }, campaignService, translationService).init()

        //Run src file
        expect(translationService.get).toHaveBeenNthCalledWith(1, "pendingLabel")
        expect($("#timerLabel").text()).toEqual("Starts")
        expect($("#campaignExpiration").text()).toEqual("in a few seconds")

        translationService.get.mockReturnValueOnce("Expires");

        await new Promise((res) => setTimeout(res, 2000))

        expect(translationService.get).toHaveBeenNthCalledWith(2, "expiresLabel")
        expect($("#timerLabel").text()).toEqual("Expires")
        expect($("#campaignExpiration").text()).toEqual("in a few seconds")

        translationService.get.mockReturnValueOnce("Expired");

        await new Promise((res) => setTimeout(res, 2000))

        expect(translationService.get).toHaveBeenNthCalledWith(3, "expiredLabel")
        expect($("#timerLabel").text()).toEqual("Expired")
        expect($("#campaignExpiration").text()).toEqual("a few seconds ago")
    })

    test("shows expires in x days if campaign is active", async () => {
        document.querySelector('html').innerHTML = `
        <span>
            <span id="timerLabel" data-string="expiresLabel">{{ timerLabel }}</span>
            <b id="campaignExpiration">{{ timerDaysUntil }}</b>
        </span>`

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            starts: moment().subtract(15, 'minutes').unix(),
            expires: moment().add(1, 'seconds').unix()
        }

        const translationService = {
            get: jest.fn()
        }

        translationService.get.mockReturnValueOnce("Expires");

        new Timer({
            labelElem: document.querySelector("#timerLabel"),
            timerElem: document.querySelector("#campaignExpiration")
        }, campaignService, translationService).init()

        //Run src file
        expect($("#timerLabel").text()).toEqual("Expires")
        expect(translationService.get).toHaveBeenCalledWith("expiresLabel")
        expect($("#campaignExpiration").text()).toEqual("in a few seconds")

        translationService.get.mockReturnValueOnce("Expired");

        await new Promise((res) => setTimeout(res, 2000))

        expect($("#timerLabel").text()).toEqual("Expired")
        expect(translationService.get).toHaveBeenCalledWith("expiredLabel")
        expect($("#campaignExpiration").text()).toEqual("a few seconds ago")
    })

    test("shows expired x days ago if campaign has ended", () => {
        document.querySelector('html').innerHTML = `
        <span>
            <span id="timerLabel" data-string="expiresLabel">{{ timerLabel }}</span>
            <b id="campaignExpiration">{{ timerDaysUntil }}</b>
        </span>`

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            starts: moment().subtract(15, 'minutes').unix(),
            expires: moment().subtract(1, 'seconds').unix()
        }

        const translationService = {
            get: jest.fn()
        }

        translationService.get.mockReturnValueOnce("Expired");

        new Timer({
            labelElem: document.querySelector("#timerLabel"),
            timerElem: document.querySelector("#campaignExpiration")
        }, campaignService, translationService).init()

        //Run src file
        expect($("#timerLabel").text()).toEqual("Expired")
        expect(translationService.get).toHaveBeenCalledWith("expiredLabel")
        expect($("#campaignExpiration").text()).toEqual("a few seconds ago")
    })
})