const sinon = require('sinon')
const setupLocationMocks = require('../setup-location-mocks')
const { expect } = require('chai')
const fs = require('fs')

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
    getFormItems, 

    Ipfs,
    initialize,
    updateForm,
    server
} = require('./campaign-utils')

describe("edit campaign form", function() {
    setupLocationMocks()

    beforeEach(() => {
        document.body.innerHTML = fs.readFileSync("./app/index.html")
    })

    it("on edit url, does not redirect when the specific campaign exists", async function() {
        window.location = new URL('http://localhost/#/edit?id=testpublishingid')

        sinon.stub(Ipfs, "create").resolves({})
        sinon.stub(server, "start").resolves([newTestCampaign])

        await initialize()

        expect(isCreateCampaignOpen()).to.be.true
        expect(isViewCampaignsOpen()).to.be.false
        expect(window.location.hash).to.equal("#/edit?id=testpublishingid")
       	getFormItems().forEach(elem => expect(elem.prop('disabled')).to.be.true)
    })

    afterEach(function() {
        sinon.restore()
    })
})