const { expect } = require('chai')
const sinon = require('sinon')
const fs = require('fs')

const moment = require('moment')
const setupLocationMocks = require('../setup-location-mocks')
const MockDate = require('mockdate')

const { 
    newTestCampaign,
    isCreateCampaignOpen,
    isViewCampaignsOpen,
    isLoadIndicatorVisible,
    isResultVisible,
    isErrorVisible,
    checkResultUrl,
    checkFormDates,
    checkFormValues,
    checkCard,
    SATS_PER_BCH,
    gateway,

    getCreateButtonText,
    getRecipientCount,
    clickAddRecipient,
    clickCreateButton,
    getFormItems,

    Ipfs,
    initialize,
    updateForm,
    server
} = require('./campaign-utils')

describe("create campaign form", function () {
    
    setupLocationMocks()

    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync("./app/index.html")
    })

    it("starts with a loading indicator and views are hidden", async function () {
        expect(isCreateCampaignOpen()).to.be.false
        expect(isViewCampaignsOpen()).to.be.false
        expect(isLoadIndicatorVisible()).to.be.true
    })

    it("removes loading indicator when finished loading", async function() {
        
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])

        await initialize()

        expect(isLoadIndicatorVisible()).to.be.false
    })

    it("on root url, starts with the create page when no campaigns exists", async function() {
        
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(isViewCampaignsOpen()).to.be.false
        expect(window.location.hash).to.equal("#/create")
    })

    it("on edit url, starts with the create page when no campaigns exists", async function() {
        window.location = new URL('http://localhost/#/edit?id=testpublishingid')

        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(isViewCampaignsOpen()).to.be.false
        expect(window.location.hash).to.equal("#/create")
    })

    it("on create url, does not redirect even if campaigns exist", async function() {
        window.location = new URL('http://localhost/#/create')

        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([newTestCampaign])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(isViewCampaignsOpen()).to.be.false
        expect(window.location.hash).to.equal("#/create")
    })

    it("create page defaults start date and end date to today and tomorrow, respectively, and not disabled", async function() {

        //This is testing that year and month changes are working correctly as well
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])

        const originalMoment = moment.fn
        const endOfYear = moment().endOf('year')
        
        MockDate.set(endOfYear.valueOf())

        expect(moment().valueOf()).to.equal(endOfYear.valueOf())

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(window.location.hash).to.equal("#/create")
        
        const startDate = moment()
        const endDate = moment().add(1, 'days')

        checkFormDates(startDate, endDate)
        getFormItems().forEach(elem => expect(elem.prop('disabled')).to.be.false)
    })

    it("adds a new recipient to the create form", async function() {

        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(isViewCampaignsOpen()).to.be.false
        expect(window.location.hash).to.equal("#/create")

        expect(getRecipientCount()).to.equal(1)
        clickAddRecipient()
        expect(getRecipientCount()).to.equal(2)
    })

    it("succeeds if fields are filled out", async function() {
        jest.setTimeout(10000)

        //This is testing that year and month changes are working correctly as well
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])
        sinon.stub(server, "create").resolves(newTestCampaign)
        sinon.stub(server, "update")

        expect(isErrorVisible()).to.be.false
        expect(isResultVisible()).to.be.false

        await initialize()

        //Testing if update form works correctly in a sense.
        updateForm(newTestCampaign)

        clickCreateButton()

        await new Promise(resolve => setTimeout(resolve, 1000))

        const expectedUrl = gateway + newTestCampaign.publishingId

        expect(server.update.notCalled).to.be.true
        expect(server.create.calledOnce).to.be.true
        expect(window.location.open.calledOnce).to.be.true
        expect(window.location.open.calledWith(expectedUrl, "flipstarter")).to.be.true

        expect(getCreateButtonText()).to.equal("Finished")

        checkResultUrl(expectedUrl)

        await new Promise(resolve => setTimeout(resolve, 5000))

        expect(getCreateButtonText()).to.equal("Update")
        expect(window.location.hash).to.equal("#/edit?id=" + newTestCampaign.publishingId)
    })

    it("fails if fields are not filled out", async function() {

        //This is testing that year and month changes are working correctly as well
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])
        sinon.stub(server, "update")
        sinon.stub(server, "create")

        expect(isErrorVisible()).to.be.false

        await initialize()

        clickCreateButton()

        expect(server.update.notCalled).to.be.true
        expect(server.create.notCalled).to.be.true

        expect(isCreateCampaignOpen()).to.be.true
        expect(window.location.hash).to.equal("#/create")
        expect(isErrorVisible()).to.be.true
    })

    it("fails to create if ipfs fails", async function() {
        jest.setTimeout(10000)

        //This is testing that year and month changes are working correctly as well
        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([])
        sinon.stub(server, "create").rejects()
        sinon.stub(server, "update")

        expect(isErrorVisible()).to.be.false
        expect(isResultVisible()).to.be.false

        await initialize()

        //Testing if update form works correctly in a sense.
        updateForm(newTestCampaign)

        clickCreateButton()

        await new Promise(resolve => setTimeout(resolve, 1000))

        expect(isErrorVisible()).to.be.true
        expect(isResultVisible()).to.be.false

        expect(server.create.calledOnce).to.be.true
        expect(server.update.notCalled).to.be.true
        expect(window.location.open.notCalled).to.be.true

        const createButtonText = getCreateButtonText()

        expect(createButtonText).not.to.equal("Finished")
        expect(createButtonText).not.to.equal("Update")
        expect(createButtonText).not.to.equal("Create")

        await new Promise(resolve => setTimeout(resolve, 5000))

        expect(getCreateButtonText()).to.equal("Create")
        expect(window.location.hash).to.equal("#/create")
    })

    afterEach(function() {
        sinon.restore()
        MockDate.reset()
        window.initializePromise = null
    })

});
