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
import { requestStream } from 'libp2p-stream-helper'
import createFlipstarterCampaignSite from './createFlipstarterCampaignSite'
const lp = require('it-length-prefixed')
const SATS_PER_BCH = 100000000;

let apiResponse

export default async function initialize() {
  $(".load-indicator").addClass("d-none")

  window.ipfs = await Ipfs.create({ 
    EXPERIMENTAL: {
      ipnsPubsub: true
    }
  })

  const { api_type, api_address, recipient_address } = qs.parse(window.location.search, { arrayFormat: 'index' })
  
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

  const startDate = getDateParts(moment().unix())
  const endDate = getDateParts(moment().add(1, 'days').unix())
  
  $("#start_year").val(startDate.year)
  $("#start_month > option").eq(startDate.month).prop('selected', true)
  $("#start_day").val(startDate.day)

  $("#end_year").val(endDate.year)
  $("#end_month > option").eq(endDate.month).prop('selected', true)
  $("#end_day").val(endDate.day)

  initializeEventListeners(ipfs)
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
  })

  // Remove recipient
  $("#form").on("click", "#recipients .remove", function() {
    $(this).parent("div").remove();
  });

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
          alias: formValues.recipient_name[i],
          address: formValues.bch_address[i],
          signature: null,
          satoshis: Number(formValues.amount[i]) * SATS_PER_BCH // to satoshis
        }
      })
      const requestedSatoshis = recipients.reduce((sum, recipient) => {
        return sum + recipient.satoshis
      }, 0)

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
        apiType: formValues.api_type,
        rewardUrl: formValues.reward_url
      }
      
      //Submit to remote address for campaign id's

      if (apiResponse) {
        
        campaign.id = apiResponse.id
        campaign.address = apiResponse.address
        
        if (campaign.apiType === "ipfs") {
          campaign.publishingId = apiResponse.publishingId
        }

      } else if (formValues.api_confirmation) {
        
        if (campaign.apiType === "ipfs") {
            
          let multiaddress
          
          try {
            
            multiaddress = Ipfs.multiaddr(formValues.api_address)
          
          } catch {
            
            throw "Invalid address"
          }

          try {
            
            await ipfs.swarm.connect(multiaddress.toString())
          
          } catch (err) {
            console.log(err)
            throw "Could not connect to remote address"
          }
        
          try {

            const peerId = Ipfs.PeerId.createFromB58String(multiaddress.getPeerId())
            const connectionStream = await ipfs.libp2p.dialProtocol(peerId, "/flipstarter/create")
            apiResponse = await requestStream(connectionStream, { campaign })

          } catch(err) {

            if (err.name === "Libp2pConnectionError") {
              throw "Failed to create flipstarter with remote server: " + err.message
            }

            throw "Failed to create flipstarter with remote server"
          
          } finally {
            
            await ipfs.swarm.disconnect(multiaddress.toString())
          }
          
          try {

            const { publishingId, addresses, ipfsId } = apiResponse
            
            campaign.publishingId = publishingId
            campaign.addresses = addresses
            campaign.ipfsId = ipfsId

          } catch {

            throw "Invalid response from remote server"
          }

        } else {
          
          let response
          const apiRoot = formValues.api_address.replace(/\/$/, "")

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

              apiResponse = await response.json()

              campaign.id = apiResponse.id
              campaign.address = apiResponse.address || apiRoot
          
          } catch {
            
            throw "Invalid response from remote server"
          }
        }

      } else {
        //TODO God willing: set address with api root and id with api id, God willing.
        campaign.id = formValues.api_id
        campaign.address = formValues.api_address.replace(/\/$/, "")
      }

      const hash = await createFlipstarterCampaignSite(ipfs, campaign)
      const url = "https://gateway.ipfs.io/ipfs/" + hash

      resultArea.removeClass("d-none")
      resultLink.prop('href', url)
      resultLink.text(url)

      window.open(url, "flipstarter")
      createBtn.text("Campaign created")

    } catch (error) {

      errorBox.removeClass("d-none")
      errorBox.text(typeof(error) === 'string' ? error : "Something went wrong. Try again.")
      createBtn.text(buttonTxt)
      createBtn.prop('disabled', false)
    }
  })
}

function getDateParts(unixDate) {
  const momentDate = moment.unix(unixDate)

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
        <p class="${ index !== 0 ? 'd-inline' : '' }">Recipient ${index + 1}</p>
        ${ index !== 0 ? '<div class="remove btn btn-link text-danger d-inline float-right">Remove</div>' : '' }
        <div class="form-row text-muted">
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