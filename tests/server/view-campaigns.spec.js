const sinon = require('sinon')
const setupLocationMocks = require('../setup-location-mocks')
const fs = require('fs')
const { expect } = require('chai')

const { 
    newTestCampaign,
    isCreateCampaignOpen,
    isViewCampaignsOpen,
    checkCard,
    SATS_PER_BCH, 
    initialize,
    Ipfs,
    server
} = require('./campaign-utils')

describe("view campaign spec", function() {
    
    setupLocationMocks()

    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync("./app/index.html")
    })

	it("on root url, starts with the view page when a campaign exists and renders the campaign correctly", async function() {
        
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([newTestCampaign])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.false
        expect(isViewCampaignsOpen()).to.be.true
        expect(window.location.hash).to.equal("")

        checkCard(newTestCampaign, {
            expectedCommitments: 0,
            expectedPercentage: "0.00",
            expectedDaysLeft: "a day left",
            expectedActive: true,
            expectedRequested: newTestCampaign.recipients[0].satoshis / SATS_PER_BCH,
            expectedCommitted: 0
        })
    })

    it("on edit url, redirects to view page when the specific campaign does not exist", async function() {
        window.location = new URL('http://localhost/#/edit?id=testpublishingid1')

        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([newTestCampaign])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.false
        expect(isViewCampaignsOpen()).to.be.true
        expect(window.location.hash).to.equal("")
    })

    it("updates a newly created campaign card on ipfs updates", async function() {
        // window.location = new URL('http://localhost/#/edit?id=testpublishingid')

        // sinon.stub(Ipfs, "create").resolves({})
        // sinon.stub(server, "start").resolves([newTestCampaign])

        // await initialize()

        // expect(isCreateCampaignOpen()).to.be.true
        // expect(isViewCampaignsOpen()).to.be.false
        // expect(window.location.hash).to.equal("#/edit?id=testpublishingid")
    })

    it("updates an existing campaign card on ipfs updates", async function() {
        // window.location = new URL('http://localhost/#/edit?id=testpublishingid')

        // sinon.stub(Ipfs, "create").resolves({})
        // sinon.stub(server, "start").resolves([newTestCampaign])

        // await initialize()

        // expect(isCreateCampaignOpen()).to.be.true
        // expect(isViewCampaignsOpen()).to.be.false
        // expect(window.location.hash).to.equal("#/edit?id=testpublishingid")
    })

    afterEach(function() {
        sinon.restore()
    })
})