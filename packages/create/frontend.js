/* eslint-disable */

import moment from 'moment'
import qs from 'query-string'
import pTimeout from 'p-timeout'
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css'
import 'popper.js'
import bchaddr from 'bchaddrjs'
import Ipfs from 'ipfs'
//import ipfsClient from 'ipfs-http-client'
import { get, set } from 'idb-keyval';
import { requestStream } from 'libp2p-stream-helper'
import createFlipstarterCampaignSite from './createFlipstarterCampaignSite'
import { SATS_PER_BCH, calculateTotalRecipientMinerFees } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"

import { markdownParser, createFlipstarterClientHtml } from '@ipfs-flipstarter/utils'

import EasyMDE from 'easymde'
import 'easymde/dist/easymde.min.css'
import 'codemirror/lib/codemirror.css'

// https://stackoverflow.com/questions/44029866/import-javascript-files-as-a-string
import clientIndexPageTempl from '!raw-loader!@ipfs-flipstarter/client/public/static/templates/index.html'
import createDOMPurify from "dompurify"

const DOMPurify = createDOMPurify(window)

export default async function initialize() {
  window.ipfs = await Ipfs.create({ 
    EXPERIMENTAL: {
      ipnsPubsub: true
    }
  })

  await initializeFormValues()
  await restoreScroll()
  
  initializeEventListeners(ipfs)

  $("html, body").removeClass("scroll-lock")
  $("#load-indicator-container").addClass("d-none")

  return false
}

function initializeEventListeners(ipfs) {

  $("#form").on("click", ".goal-input", function() {
    var elem = $(this)
    elem.val(Number(elem.val()).toFixed(8));
  }) 

  $("#form").on("keydown", ".goal-input", function(e) {
    if (e.which === 38 || e.which === 40) {
      var elem = $(this)
      elem.val(Number(elem.val()).toFixed(8));
    }
  })   

  // Prevent letters in date inputs
  $("#form").on("keypress", ".date-input", function(evt) {
    if (evt.which < 48 || evt.which > 57) {
      evt.preventDefault();
    }
  });

  // Allow only numbers and dot in goal input
  $("#form").on("keypress", ".goal-input", function(evt) {
    if (evt.which < 46 || evt.which > 57 || evt.which === 47) {
      evt.preventDefault();
    }
  });

  $("#form").on("click", "#api_confirmation", function(evt) {
    const idFieldContainer = $("#api_id_container")
    const idField = $("#api_id")
    const addressFieldContainer = $("#api_address_container")

    const showIdField = !$(this).prop("checked")

    if (showIdField) {

      idFieldContainer.removeClass("d-none")
      addressFieldContainer.removeClass("col-8")
      addressFieldContainer.addClass("col-4")
      idField.prop("required", true)

    } else {
      idFieldContainer.addClass("d-none")
      addressFieldContainer.addClass("col-8")
      addressFieldContainer.removeClass("col-4")
    }
  })

  $("#form").on("click", "#add-recipient", function(evt) {
    addRecipient()
    
    const recipientNum = $('#recipients .recipient').length
    //TODO God willing: import from shared library, God willing
    $("#recipients-fee").text(`+${ calculateTotalRecipientMinerFees(recipientNum) } SATS *`)
  })

  // Remove recipient
  $("#form").on("click", "#recipients .remove", function() {
    $(this).parent("div").remove();
    
    const recipientNum = $('#recipients .recipient').length

    //TODO God willing: import from shared library, God willing
    $("#recipients-fee").text(`+${ calculateTotalRecipientMinerFees(recipientNum) } SATS *`)
  });

  $("#preview-close").on("click", async function (event) {
    event.preventDefault()
    $("#preview-content-container").addClass("d-none")
  })

  $("#form").on("click", "#preview", async function (event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    const clientPageHtml = await (await fetch("client.html")).text()
    const campaign = getCampaignFormValues()

    $("#preview-content-container").removeClass("d-none")
    $("#preview-content")[0].srcdoc = await createFlipstarterClientHtml(clientPageHtml, campaign)
  })

  $("#form").on("click", "#create", async function(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    let createBtn = $("#create")
    let resultArea = $("#result")
    let resultLink = $("#result a")
    let buttonTxt = createBtn.text()
    let errorBox = $("#error")

    try {

      createBtn.prop('disabled', true)
      createBtn.text("Working on it...")
      resultArea.addClass("d-none")
      errorBox.addClass("d-none")

      const campaign = getCampaignFormValues()
      
      //Submit to remote address for campaign id and addresses
      if (!campaign.id) {

        const { id, address } = requestFlipstarterCampaign(campaign)

        //TODO God willing: set api_type via address
        campaign.id = id
        campaign.address = address

        // Set new id and address and set api confirmation to false for future
        setApiFields(id, address, false)
      }

      // const gatewayUrl = formValues.gateway_address || "https://gateway.ipfs.io"
      const gatewayUrl = "https://gateway.ipfs.io"
      const indexPageHtml = await createFlipstarterClientHtml(clientIndexPageTempl, campaign)
      const hash = await createFlipstarterCampaignSite(ipfs, indexPageHtml, campaign)

      const url = gatewayUrl + "/ipfs/" + hash

      resultArea.removeClass("d-none")
      resultLink.prop('href', url)
      resultLink.text(url)

      window.open(url, "flipstarter")
      createBtn.html('Campaign created. <small style="display: block;font-size: 12px;">(click again to reupload)</small>')

      createBtn.prop('disabled', false)
      
      // Remove the draft functionality on refresh
      set("draft", undefined)

      // Save the campaign in local in case using dns or ipns
      set(campaign.id, campaign)

    } catch (error) {

      errorBox.removeClass("d-none")
      errorBox.text(typeof(error) === 'string' ? error : "Something went wrong. Try again.")
      createBtn.text(buttonTxt)
      createBtn.prop('disabled', false)
    }
  })
  
  $("#form")[0].addEventListener('change', (event) => {
    const campaign = getCampaignFormValues()
    set("draft", campaign)
  }, true, true)

  $(window).on("scroll", () => {
    set("scrollHeight", window.scrollY)
  })
}

function setApiFields(apiType, address, sendFlag = true) {
  $(`#api_type > option`).prop('selected', false)
  $(`#api_type > option[value=${apiType}]`).prop('selected', true)

  if (apiType === "https") {
    $("#api_address").val(address)
  }

  $("api_confirmation").prop("checked", sendFlag)
}

async function requestFlipstarterCampaign(campaign, apiType, address) {
        
  if (apiType === "ipfs") {
      
    let multiaddress
    
    try {
      
      multiaddress = Ipfs.multiaddr(address)
    
    } catch {
      
      throw "Invalid address"
    }

    try {
      
      await ipfs.swarm.connect(multiaddress.toString())
    
    } catch (err) {
      console.log(err)
      throw "Could not connect to remote address"
    }
    
    let response

    try {

      const peerId = Ipfs.PeerId.createFromB58String(multiaddress.getPeerId())
      const connectionStream = await ipfs.libp2p.dialProtocol(peerId, "/flipstarter/create")
      response = await requestStream(connectionStream, { campaign })

    } catch(err) {

      if (err.name === "Libp2pConnectionError") {
        throw "Failed to create flipstarter with remote server: " + err.message
      }

      throw "Failed to create flipstarter with remote server"
    
    } finally {
      
      await ipfs.swarm.disconnect(multiaddress.toString())
    }
    
    try {

      const { publishingId, addresses, ipfsId } = response

      return { 
        id: publishingId,
        address: { addresses, peerId: ipfsId }
      }

    } catch {

      throw "Invalid response from remote server"
    }

  } 
  
  if (apiType === "https") {
    
    let response
    const apiRoot = address.replace(/\/$/, "")

    try {
      
      response = await pTimeout(await fetch(apiRoot + "/create", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaign)
      }), 60000)

    } catch (error) {
      throw "Failed to create flipstarter with remote server"
    }

    if (response.status === 403) {
      throw "Unauthorized to access remote server"
    }

    if (response.status !== 200) {
        throw "Invalid response from remote server"
    }

    try {          

        const response = await response.json()

        return {
          id: response.id,
          address: response.address || apiRoot
        }
    
    } catch {
      
      throw "Invalid response from remote server"
    }
  }
}

function getCampaignFormValues() {

  const formValues = qs.parse($("form").serialize(), { arrayFormat: 'index' })

  // Convert date to EPOCH
  const start_year = formValues.start_year;
  const start_month = formValues.start_month;
  const start_day = formValues.start_day;
  const start_date = moment(start_year + "-" + start_month + "-" + start_day, "YYYY-MM-DD").unix()

  const end_year = formValues.end_year;
  const end_month = formValues.end_month;
  const end_day = formValues.end_day;
  const end_date = moment(end_year + "-" + end_month + "-" + end_day, "YYYY-MM-DD").unix()

  const recipients = formValues.recipient_name.map((_, i) => {
    return {
      name: formValues.recipient_name[i],
      url: formValues.project_url[i],
      image: formValues.image_url[i],
      address: formValues.bch_address[i],
      signature: null,
      satoshis: Number(formValues.amount[i]) * SATS_PER_BCH // to satoshis
    }
  })

  const campaign = {
    title: formValues.title,
    starts: Number(start_date),
    expires: Number(end_date),
    recipients,
    contributions: [],
    fullfilled: false,
    fullfillmentTx: null,
    fullfillmentTimestamp: null,
    descriptions: {
      "en": { abstract: formValues.abstract, proposal: formValues.proposal },
      "es": { abstract: formValues.abstractES, proposal: formValues.proposalES },
      "zh": { abstract: formValues.abstractZH, proposal: formValues.proposalZH },
      "ja": { abstract: formValues.abstractJA, proposal: formValues.proposalJA }
    },
    rewardUrl: formValues.reward_url,
    apiType: formValues.api_type
  }

  // Return id to the caller if no api confirmation to send (which will override existing id)
  if (!formValues.api_confirmation) {
    
    campaign.id = formValues.api_id
    
    if (formValues.api_type === "https") {
      campaign.address = formValues.api_address.replace(/\/$/, "")
    }

    if (formValues.api_type === "ipfs") {
      campaign.address = formValues.api_address
    }
  }

  return campaign
}

async function restoreScroll() {
  const scrollHeight = await get("scrollHeight")
  //Only scroll if we have a title
  if ($("#title").val() && scrollHeight) {
    window.scrollTo(0, scrollHeight)
  } else {
    window.scrollTo(0, 0)
  }
}

function setCampaignFormValues(campaign) {
  if (campaign.title) {
    $("#title").val(campaign.title)
  }

  if (campaign.id) {
    //TODO God willing: rename to just id
    // Number of ways to guarantee a unique id, God willing.
    // That can be used in other places. Just prove you "own" it, God willing.
    $("#api_id").val(campaign.id)
  }

  //Set flag initially if no campaign id
  setApiFields(campaign.apiType, campaign.address, !campaign.id)

  if (campaign.address) {
    $("#api_address").val(campaign.address)
    $("#api_confirmation").prop( "checked", true );
  }

  (campaign.recipients || []).forEach((recipient, i) => {
    $(`#recipient_name\\[${i}\\]`).val(recipient.name),
    $(`#project_url\\[${i}\\]`).val(recipient.url),
    $(`#image_url\\[${i}\\]`).val(recipient.image),
    $(`#bch_address\\[${i}\\]`).val(recipient.address),
    $(`#amount\\[${i}\\]`).val(recipient.satoshis ? (recipient.satoshis / SATS_PER_BCH).toFixed(8) : 0) // to bch
  })

  const startDate = campaign.starts ? moment.unix(campaign.starts) : moment.unix()
  const endDate = campaign.expires ? moment.unix(campaign.expires) : moment().add(1, 'days').unix()
  setDates(startDate, endDate)

  if (campaign.rewardUrl) {
    $("#reward_url").val(campaign.rewardUrl)
  }

  ["en", "es", "zh", "ja"].forEach(lang => {
    const { abstract, proposal } = campaign.descriptions[lang] || {}
    const suffix = lang === "en" ? "" : lang.toUpperCase()

    if (abstract) {
      $("#abstract" + suffix).val(abstract)
    }

    if (proposal) {
      $("#proposal" + suffix).val(proposal)
    }
  })
}

async function initializeFormValues() {
  const campaign = await get("draft")

  if (campaign) {

    setCampaignFormValues(campaign)

  } else {

    const { api_type, api_address, recipient_address } = qs.parse(window.location.search, { arrayFormat: 'index' })
    
    //Set api confirmation flag to true
    setApiFields(api_type, api_address, true)

    if (api_type === "ipfs" || api_type === "https") {
      $(`#api_type > option[value=${api_type}]`).prop('selected', true)
    }

    if (api_address) {
      $("#api_address").val(api_address)
      $("#api_confirmation").prop( "checked", true );
    }

    if (recipient_address) {
      $("#bch_address\\[0\\]").val(recipient_address)
    }
    
    const startDate = moment().unix()
    const endDate = moment().add(1, 'days').unix()
    setDates(startDate, endDate)
  }
  
  const abstractElem = $('#abstract')
  const proposalElem = $('#proposal')

  const easyMDEs = [new EasyMDE({
    element: abstractElem[0],
    //TODO God willing: upload images to IPFS or save URL, God willing. 
    //imageUploadEndpoint
    hideIcons: ["side-by-side", "fullscreen"],
    previewRender: (markdown, previewElem) => { 
      (async () => {
        previewElem.innerHTML = DOMPurify.sanitize(await markdownParser(markdown))
      })()

      return ""
    },
    //TODO God willing: immediately update form and trigger save (no ref to mde)
    forceSync: true
  }), new EasyMDE({
    element: proposalElem[0],
    hideIcons: ["side-by-side", "fullscreen"],
    previewRender: (markdown, previewElem) => { 
      (async () => {
        previewElem.innerHTML = DOMPurify.sanitize(await markdownParser(markdown))
      })()

      return ""
    },
    //TODO God willing: immediately update form and trigger save (no ref to mde)
    forceSync: true
  })]

  easyMDEs.forEach(easyMDE => easyMDE.codemirror.on("change", function(){
    $("#form")[0].dispatchEvent(new Event('change'))
  }));
}

function setDates(start, end) {
  const startDate = getDateParts(start)
  const endDate = getDateParts(end)

  $("#start_year").val(startDate.year)
  $("#start_month > option").eq(startDate.month).prop('selected', true)
  $("#start_day").val(startDate.day)

  $("#end_year").val(endDate.year)
  $("#end_month > option").eq(endDate.month).prop('selected', true)
  $("#end_day").val(endDate.day)
}

function getDateParts(unixDate) {
  const momentDate = moment.isMoment(unixDate) ? unixDate : moment.unix(unixDate)

  return {
    year: momentDate.format('YYYY'),
    month: momentDate.month(),
    day: momentDate.format('D')
  }
}

function addRecipient() {
  const maxRecipients = 6;
  const index = $('#recipients .recipient').length

  if (index < maxRecipients) {
    $("#recipients").append(
      `<div class="recipient">
        <p class="${ index !== 0 ? 'd-inline' : '' }">Recipient ${index + 1}</p> ${ index !== 0 ? '<div class="remove btn btn-link text-danger d-inline float-right">Remove</div>' : '' }
        <div class="form-row text-muted clearfix">
          <div class="form-group col-lg-4">
            <label for="amount[${index}]">Funding Goal <small>(amount in BCH)</small></label>
            <input type="number" class="form-control goal-input" id="amount[${index}]" name="amount[${index}]" step="0.00000001" min="0.00000546" required>
          </div>
          <div class="form-group col-lg-4">
            <label for="image_url[${index}]">Image URL</label>
            <input type="text" class="form-control check-url" id="image_url[${index}]" name="image_url[${index}]" required>
          </div>
          <div class="form-group col-lg-4">
            <label for="recipient_name[${index}]">Recipient Name</label>
            <input type="text" class="form-control" id="recipient_name[${index}]" name="recipient_name[${index}]" required>
          </div>
        </div>
        <div class="form-row text-muted">
          <div class="form-group col-md-6">
            <label for="bch_address[${index}]">Bitcoin Cash Address <small>(include bitcoincash: prefix)</small></label>
            <input type="text" class="form-control check-bch-address" id="bch_address[${index}]" name="bch_address[${index}]" required>
          </div>
          <div class="form-group col-md-6">
            <label for="project_url[${index}]">Recipient Website</label>
            <input type="text" class="form-control check-url" id="project_url[${index}]" name="project_url[${index}]" required>
          </div>
        </div>
      </div>`
    );
  } else {
    $(".js-add-recipient").hide();
  }
}

// Check if URL is valid
function validateURL(textval) {
  // regex modified from https://github.com/jquery-validation/jquery-validation/blob/c1db10a34c0847c28a5bd30e3ee1117e137ca834/src/core.js#L1349
  var urlregex = /^(?:(?:(?:https?):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i;
  return urlregex.test(textval);
}

function checkValidity(elem) {
  return elem[0].checkValidity()
}

// Validate form before submitting
function validateForm() {
  var formValid =  checkValidity($('form'))
  $('.form-control').removeClass('border-danger text-danger');

  $('.form-control').each(function() {
    let inputValid = checkValidity($(this))
    if ( ($(this).prop('required') && ($(this).val().length == 0 || $(this).val() == " ")) // test for blank while required
      || ($(this).hasClass('check-url') && !validateURL($(this).val())) // test for check URL
    ) {
      inputValid = false;
      formValid = false;
    }

    // Test for BCH address
    if ($(this).hasClass('check-bch-address')) {
      if (bchaddr.isValidAddress($(this).val())) {
        if (bchaddr.isLegacyAddress($(this).val())) {
          // isLegacyAddress throws an error if it is not given a valid BCH address
          // this explains the nested if
          inputValid = false;
          formValid = false;
        }
      } else {
        inputValid = false;
        formValid = false;
      }
    }

    let showError = $(this).parent().find(".show-error-on-validation")

    // After all validation
    if (!inputValid) {
      
      $(this).addClass('border-danger text-danger');
      
      if (showError.length) {
        showError.removeClass("d-none")
      }

    } else {
      if (showError.length) {
        showError.addClass("d-none")
      }
    }
  });

  // Submit if everything is valid
  if (formValid) {
    return true
  } else {
    $("#error").removeClass("d-none");
    $("#error").text("Some fields are incorrect.")
    return false
  }
}

window.initializatonPromise = initialize()