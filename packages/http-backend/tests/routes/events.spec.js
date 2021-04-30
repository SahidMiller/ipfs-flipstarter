const { expect, test, describe } = require('@jest/globals')
const request = require('supertest')
const { TextDecoder, TextEncoder } = require('util');
const moment = require('moment')
const EventSource = require('eventsource')
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

jest.mock("@ipfs-flipstarter/utils")
jest.mock("fs")
jest.mock("path")

const express = require('express')
const router = require('../../routes/events')

const { urlencoded, json } = require("body-parser");
const { Hub } = require('@toverux/expresse');

describe("events", () => {
    
    let server
    let es

    test("it broadcasts to registered clients", async () => {
        
        const app = express()
        
        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.debug = {
            server: jest.fn()
        }

        app.queries = {
            getCampaign: {
                //Return object for found campaign logic 
                get: jest.fn().mockReturnValue({

                })
            },
            listContributionsByCampaign: {
                all: jest.fn().mockReturnValue([

                ])
            }
        }

        require('../../src/events')(app)
        require('../../middleware/campaignEventsMiddleware')

        app.use("/events", router)

        server = app.listen(54545)

        //Doesn't matter the id as long as getCampaign returns 
        es = new EventSource("http://localhost:54545/events/1")
        const errorEventListener = jest.fn()
        
        es.addEventListener("error", errorEventListener)
        const initEventObj = await new Promise(res => es.addEventListener("init", res))

        expect(JSON.parse(initEventObj.data)).toEqual({ contributions: [] })
        expect(errorEventListener).toBeCalledTimes(0)
        
        function sendEvent(campaignId, eventName, ...eventData) {
            return new Promise((res) => {
                setTimeout(res, 2000)

                es.addEventListener(eventName, function (event) {
                    res(event)
                    es.removeEventListener(this)
                })
                
                app.sse.event(campaignId, eventName, ...eventData)
            })
        }
        
        const event1 = await sendEvent(1, "testName", "test1");
        expect(event1).toEqual(expect.objectContaining({ data: JSON.stringify("test1") }))

        const event2 = await sendEvent(2, "testName", { data: "test2" });
        expect(event2).toEqual(undefined)
    })

    test("it should 404 if campaign doesn't exist", async () => {
        
        const app = express()
        
        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.debug = {
            server: jest.fn()
        }

        app.queries = {
            getCampaign: {
                //Return undefined for not found logic 
                get: jest.fn().mockReturnValue()
            }
        }

        require('../../src/events')(app)
        require('../../middleware/campaignEventsMiddleware')

        app.use("/events", router)

        server = app.listen(54545)

        es = new EventSource("http://localhost:54545/events/2")
        const initEventListener = jest.fn()
        const errorEventListener = jest.fn()
        
        es.addEventListener("init", initEventListener)
        es.addEventListener("error", errorEventListener)

        await new Promise((res) => setTimeout(res, 1000))

        expect(initEventListener).toBeCalledTimes(0)
        expect(errorEventListener).toBeCalledTimes(1)
    })

    afterEach(() => {
        es && es.close()
        server && server.close()
    })
})
