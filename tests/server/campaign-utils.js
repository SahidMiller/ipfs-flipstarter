const moment = require('moment')
const $ = require('jquery')
const { expect } = require('chai')

const newTestCampaign = { 
    title: "Interplanetary Flipstarters",
    starts: moment().unix(),
    expires: moment().add(1, 'day').unix(),
    recipients: [{
        name: "Test",
        url: "https://test.com",
        image: "https://bitcoin.com/img/logo.png",
        alias: "test",
        address: "bchtest:qqgw6nhes8lxr9z9z2x3mkvjgsvnwv5rfqqy5m99dg",
        signature: null,
        satoshis: 100000
    }],
    contributions: [],
    fullfilled: false,
    fullfillmentTx: null,
    fullfillmentTimestamp: null,
    publishingId: "testpublishingid"
}

const SATS_PER_BCH = 100000000;
const gateway = "https://gateway.ipfs.io/ipns/"

const isCreateCampaignOpen = () => !$("#create-title").hasClass("d-none")
const isViewCampaignsOpen = () => !$("#view-title").hasClass("d-none")
const isLoadIndicatorVisible = () => !$(".load-indicator").hasClass("d-none")
const isResultVisible = () => !$('#result').hasClass('d-none')
const isErrorVisible = () => !$('#error').hasClass("d-none")
const checkResultUrl = (url) => {
    expect(isResultVisible()).to.be.true
    const resultElem = $('#result > a')
    expect(resultElem.text()).to.equal(url)
    expect(resultElem.prop('href')).to.equal(url)
}

const checkFormDates = (startDate, endDate) => {
    expect($("#start_year").val()).to.equal(startDate.format('YYYY'))
    expect($("#start_month > option").eq(startDate.month()).prop('selected')).to.be.true
    expect($("#start_day").val()).to.equal(startDate.format('D'))

    expect($("#end_year").val()).to.equal(endDate.format('YYYY'))
    expect($("#end_month > option").eq(endDate.month()).prop('selected')).to.be.true
    expect($("#end_day").val()).to.equal(endDate.format('D'))
}

const checkFormValues = (campaign) => {
    expect($("#title").val()).to.equal(campaign.title)

    const startDate = moment.unix(campaign.starts)
    const endDate = moment.unix(campaign.expires)

    checkFormDates(startDate, endDate)

    const recipients = $("#recipients .recipient")
    expect(recipients.length).to.equal(campaign.recipients.length)
    
    campaign.recipients.forEach((recipient, idx) => {
        expect($(`#amount\\[${idx}\\]`).val()).to.equal(((recipient.satoshis || 0) / SATS_PER_BCH).toString())
        expect($(`#image_url\\[${idx}\\]`).val()).to.equal(recipient.image)
        expect($(`#recipient_name\\[${idx}\\]`).val()).to.equal(recipient.name)
        expect($(`#bch_address\\[${idx}\\]`).val()).to.equal(recipient.address)
        expect($(`#project_url\\[${idx}\\]`).val()).to.equal(recipient.url)
    })
}

const checkCard = (campaign, { expectedActive, expectedDaysLeft, expectedCommitments, expectedRequested, expectedCommitted, expectedPercentage }) => {
    const card = $(`#campaigns .cards[data-id^="${campaign.publishingId}"]`)
    expect(card.length).to.equal(1)
    expect(card.parents(expectedActive ? '#ongoing-campaign-container' : '#completed-campaign-container').length).to.equal(1)
    expect(card.find('.card-title').text()).to.equal(campaign.title)
    expect(card.find('img').prop('src')).to.equal(campaign.recipients[0].image)
    expect(card.find('.progress + small').text()).to.equal(`${expectedCommitted} of ${expectedRequested} BCH (${expectedPercentage}% completed)`)
    expect(card.find('.card-funding > p').text()).to.equal(expectedCommitments === 1 ? '1 pledge' : expectedCommitments + " pledges")
    expect(card.find('.card-goal > p').text()).to.equal(expectedDaysLeft)
}

const server = require('../../app/static/js/server').default
const Ipfs = require('ipfs')
const { default: initialize, updateForm } = require('../../app/static/js/server-frontend')

module.exports = { 
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
    gateway,
    SATS_PER_BCH,
    server,
    Ipfs,
    initialize,
    updateForm,
    getFormItems: () => {
        const formItems = ["#title", "#start_year", "#start_month",  "#start_day",  "#end_year",  "#end_month",  "#end_day",  "#recipients input"]
        return formItems.map((selector) => $(selector))
    },
    clickAddRecipient: () => $('#add-recipient').click(),
    clickCreateButton: () => $('#create').click(),
    getCreateButtonText: () => $('#create').text(),
    getRecipientCount: () => $('#recipients .recipient').length
}