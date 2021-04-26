const { describe, test, expect } = require("@jest/globals");
const moment = require("moment");
const { TextDecoder, TextEncoder } = require('util');
const EventEmitter = require('events')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const { default: Celebration } = require("../../src/components/celebration")

describe("celebration", () => {
        
    test("calls celebration effect once fullfilled", () => {
        document.querySelector('html').innerHTML = `<audio src="" id="applause"></audio>`

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            fullfilled: false,
            fullfillmentTimestamp: null,
        }

        new Celebration({
            applause: document.getElementById("applause")
        }, campaignService).init()

        const $ = require('jquery')

        $("audio")[0].play = jest.fn()

        //Expect that it shouldn't update
        expect($("audio")[0].play).toHaveBeenCalledTimes(0)

        campaignService.emit('update', {
            fullfilled: true,
            fullfillmentTimestamp: moment().unix()
        })

        //Update so that it's fullfilled, God willing.
        expect($("audio")[0].play).toHaveBeenCalled()
    })

    test("doesn't call celebration if completed before initialization", () => {
        document.querySelector('html').innerHTML = `<audio src="" id="applause"></audio>`

        const campaignService = new EventEmitter()
        campaignService.campaign = {
            fullfilled: true,
            fullfillmentTimestamp: moment().subtract(1, 'second').unix(),
        }

        new Celebration({
            applause: document.getElementById("applause")
        }, campaignService).init()

        const $ = require('jquery')

        $("audio")[0].play = jest.fn()

        //Expect that it shouldn't update
        expect($("audio")[0].play).toHaveBeenCalledTimes(0)

        campaignService.emit('update', campaignService.campaign)

        //Update so that it's fullfilled, God willing.
        expect($("audio")[0].play).toHaveBeenCalledTimes(0)
    })
})