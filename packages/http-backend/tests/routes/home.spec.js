const { expect, test, describe } = require('@jest/globals')
const request = require('supertest')
const { TextDecoder, TextEncoder } = require('util');
const moment = require('moment')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

jest.mock("@ipfs-flipstarter/utils")
jest.mock("fs")
jest.mock("path")

const express = require('express')
const router = require('../../routes/home')

const { urlencoded, json } = require("body-parser")

describe("home", () => {

    test("it redirects to create page if fresh install", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/", router)
        
        app.debug = {
            server: jest.fn()
        }

        app.config = {
            server: {
                redirectHomeUrl: ""
            }
        }

        app.freshInstall = true
        
        const req = request(app)
        const response = await req.get('/')

        expect(response.status).toBe(302)
        expect(response.headers.location).toBe(`/create`)
    })

    test("it returns campaign json", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/", router)
        
        app.debug = {
            server: jest.fn(),
            object: jest.fn()
        }

        app.config = {
            server: {
                url: ""
            },
            defaultCampaignId: 1
        }

        app.queries =  {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    campaign_id: 1
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([])
            }
        }

        const req = request(app)
        const response = await req.get('/campaign.json')

        expect(response.body).toEqual(expect.objectContaining({
            id: 1,
            address: "//" + response.request.host
        }))
    })

    test("it redirects to the configured url if configured and not fresh install", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/", router)
        
        app.debug = {
            server: jest.fn()
        }

        app.config = {
            server: {
                redirectHomeUrl: "redirect.com"
            }
        }

        app.freshInstall = false

        const req = request(app)
        const response = await req.get('/')

        expect(response.status).toBe(302)
        expect(response.headers.location).toBe(`redirect.com`)
    })

    test("it fetches campaign if not fresh install and no configured url", async () => {
        const app = express()

        app.use(urlencoded({ extended: true }));
        app.use(json());

        app.use("/", router)
        
        app.debug = {
            server: jest.fn()
        }

        app.config = {
            server: {
                redirectHomeUrl: "",
                url: ""
            },
            defaultCampaignId: 1
        }

        app.queries =  {
            getCampaign: {
                get: jest.fn().mockReturnValue({
                    campaign_id: 1
                })
            },
            listRecipientsByCampaign: {
                all: jest.fn().mockReturnValue([])
            }
        }

        app.freshInstall = false
        const { createFlipstarterClientHtml } = require("@ipfs-flipstarter/utils")
        const { join } = require('path')
        const { readFileSync } = require('fs')

        createFlipstarterClientHtml.mockResolvedValue("expected return")
        join.mockReturnValue("/expected/path")
        readFileSync.mockReturnValue("<html><body>{{campaign.id}}</body></html>")

        const req = request(app)
        const response = await req.get('/')
        const host = response.request.host;

        expect(response.status).toBe(200)
        expect(response.text).toEqual("expected return")
        
        expect(join).toHaveBeenCalledWith(
            undefined, //Not sure how to mock package.json folder
            "/public/static/templates/index.html"
        )

        expect(readFileSync).toHaveBeenCalledWith(
            "/expected/path",
            "utf-8"
        )

        expect(createFlipstarterClientHtml).toHaveBeenLastCalledWith(
            "<html><body>{{campaign.id}}</body></html>",
            {
                id: 1,
                title: "",
                starts: 0,
                expires: 0,
                recipients: [],
                address: "//" + host,
                apiType: "https",
                contributions: [],
                descriptions: {
                    en: { abstract: "", proposal: "" },
                    zh: { abstract: "", proposal: "" },
                    es: { abstract: "", proposal: "" },
                    ja: { abstract: "", proposal: "" }
                },
                rewardUrl: ""
            }
        )
    })
})