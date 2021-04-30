const { expect, test, describe } = require('@jest/globals')
const request = require('supertest')
const { TextDecoder, TextEncoder } = require('util');
const moment = require('moment')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const express = require('express')
const router = require('../../routes/create')

const { urlencoded, json } = require("body-parser");

describe("create route", () => {

    test("redirects to the configured url on get", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/create", router)
        
        app.debug = {
            server: jest.fn()
        }

        app.config = {
            server: {
                redirectCreateUrlBase: ""
            }
        }

        const req = request(app)
        const response = await req.get('/create')
        const host = "//" + response.request.host

        expect(response.status).toBe(302)
        expect(response.headers.location).toBe(`?api_address=${host}&api_type=https`)
    })

    //TODO God willing: return server type or multiaddrs, God willing. (protocols)
    test("creates a new campaign and returns id + server address", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/create", router)
                
        app.debug = {
            server: jest.fn()
        }

        app.config = {
            server: {
                url: ""
            },
            auth: {
                type: 'pending-contributions',
                validAuthCampaigns: [1]
            }
        }

        app.queries = {
            getCommitmentsByAddress: {
                all: jest.fn().mockReturnValue([{
                    campaign_id: 1
                }])
            },
            addCampaign: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            addUser: {
                run: jest.fn().mockReturnValue({
                    lastInsertRowid: 1
                })
            },
            addRecipientToCampaign: {
                run: jest.fn()
            }
        }

        app.freshInstall = false

        const req = request(app)
        const response = await req.post('/create')
            .set('Content-Type', 'application/json')
            .send({
                recipients: [{ address: "bchtest", satoshis: 1 }],
                title: "",
                starts: moment().subtract(1, 'days').unix(),
                expires: moment().add(1, 'days').unix()
            })
        
        const host = "//" + response.request.host
        
        expect(app.freshInstall).toBeFalsy()
        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            id: 1,
            address: host
        })
    })
})