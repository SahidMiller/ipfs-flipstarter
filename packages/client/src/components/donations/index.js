
// Load the moment library to better manage time.
import moment from "moment"

import createDOMPurify from "dompurify"
import { get, set } from 'idb-keyval'

const DOMPurify = createDOMPurify(window)

import { SATS_PER_BCH, calculateTotalContributorMinerFees } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"
import { loadCurrencyRates } from "../../utils/rates"
import Status from "./status"

export default class DonationInput {
  constructor({ 
    donateArea, 
    donateStatus, 
    donateFormContainer,
    donateSlider,
    donateButton,
    donateText,
    donateAmount,

    contributionName,
    contributionComment,
    
    providerSection,
    electrumSection

  }, campaignService, translationService, donationService) {
    this.donateArea = donateArea
    this.donateStatus = donateStatus
    this.donateFormContainer = donateFormContainer
    this.donateSlider = donateSlider
    this.donateButton = donateButton
    this.donateText = donateText
    this.donateAmount = donateAmount

    this.contributionName = contributionName
    this.contributionComment = contributionComment
    
    this.electrumSection = electrumSection
    this.providerSection = providerSection

    this.campaignService = campaignService
    this.translationService = translationService
    this.donationService = donationService

    this.statusComponent = new Status({
      donateStatus, 
      donateField: donateArea, 
      donateForm: donateFormContainer
    }, this.campaignService, this.translationService)
  }

  init() {

    this.statusComponent.init()

    // Attach event handlers.    
    this.loadCurrencyRates()
    
    if (this.providerSection) {
      this.providerSection.classList.add("hidden")
    }

    if (this.donateSlider) {
      this.donateSlider.addEventListener("input", this.updateContributionInput.bind(this));
    }

    if (this.donateButton) {
      this.donateButton.addEventListener("click", this.toggleSection.bind(this, undefined, "providerSection"))
    }

    if (this.contributionName) {
      this.contributionName.addEventListener("focus", this.activateInputField);
      this.contributionName.addEventListener("blur", this.activateInputField);
      this.contributionName.addEventListener("change", this.updateContributionName.bind(this));
      this.contributionName.addEventListener("keyup", this.updateContributionName.bind(this));
    }

    if (this.contributionComment) {
      this.contributionComment.addEventListener("focus", this.activateInputField);
      this.contributionComment.addEventListener("blur", this.activateInputField);
      this.contributionComment.addEventListener("change", this.updateContributionComment.bind(this));
      this.contributionComment.addEventListener("keyup", this.updateContributionComment.bind(this));
    }
    
    if (this.electrumButton) {
      //TODO God willing, on slide, updateTemplate
      this.electrumButton.addEventListener("click", this.toggleSection.bind(this, undefined, "electrumSection"))
    }

    if (this.donationService) {

      this.donationService.on("commitment-success", this.parseCommitment.bind(this))
      
      this.donationService.on("commitment-pending", (() => {
        // Disable the name and comment inputs.
        this.contributionName.disabled = true;
        this.contributionComment.disabled = true;
      }).bind(this))

      this.donationService.on("commitment-success", (() => {
        // Enable the name and comment inputs.
        this.contributionName.disabled = false;
        this.contributionComment.disabled = false;
      }).bind(this))

      this.donationService.on("commitment-failed", (() => {
        // Enable the name and comment inputs.
        this.contributionName.disabled = false;
        this.contributionComment.disabled = false;
      }).bind(this))
    }

    if (this.campaignService) {

      this.campaignService.subscribe(((campaign) => {

        const requestedSatoshis = campaign.requestedSatoshis + campaign.minerFee
        const committedSatoshis = (campaign.committedSatoshis || 0) - (campaign.totalCommittedMinerFees || 0)
        
        this.campaignTotalAmountLeft = requestedSatoshis - committedSatoshis
      }).bind(this))

      this.contributorMinerFees = calculateTotalContributorMinerFees(1, this.campaignService.targetFeeRate)
    }

    // Update the input to reflect the current langauge.
    this.refresh()
  }

  updateContributionName(event) {
    this.donationService.updateName(event.target.value)
  }

  updateContributionComment(event) {
    this.donationService.updateComment(event.target.value)
  }

  async loadCurrencyRates() {
    const languageCode = this.translationService.languageCode
    // Make a list of currencies to use for each language.
    const currencies = {
      en: "USD",
      zh: "CNY",
      ja: "JPY",
      es: "EUR",
    };
    
    if (!this.currencyRates) {
      this.currencyRates = await loadCurrencyRates()
    }
    
    if (this.currencyRates && this.currencyRates instanceof Array) {
      const { rate } = this.currencyRates.find((obj) => obj.code === currencies[languageCode]) || {}
      if (rate) {
        this.currencyFiatRate = rate
      }
    }

    this.translationService.on('update', async ({ languageCode }) => {
        
      if (this.currencyRates && this.currencyRates instanceof Array) {

        const { rate } = this.currencyRates.find((obj) => obj.code === currencies[languageCode]) || {}

        if (rate) {
          
          this.currencyFiatRate = rate
        }
      }
    })
  }

  async updateContributionInput(event) {
    let donationAmount;

    // Hide donation section.
    this.toggleSection(false, "providerSection");

    // Enable the action button.
    this.donateButton.disabled = false;

    const percentage = parseFloat(event.target.value) / 100
    
    if (Number(event.target.value) <= 1) {
      // Reset metadata.
      this.contributionName.value = "";
      this.contributionComment.value = "";

      // Disable the action button.
      this.donateButton.disabled = true;

      // Set amount to 0.
      donationAmount = 0;

    } else {
      
      //Add per contribution fee to donation amount, God willing
      donationAmount = (this.contributorMinerFees || 0) + Math.ceil((this.campaignTotalAmountLeft || 0) * percentage);
    }

    if (Number(event.target.value) >= 100) {
      
      this.donateText.textContent = this.translationService.get("fullfillText");
    
    } else {

      this.donateText.textContent = this.translationService.get("donateText");
    }
    
    const bchTotal = (donationAmount / SATS_PER_BCH).toLocaleString()
    const bchCost = (this.currencyValue * (donationAmount / SATS_PER_BCH)).toFixed(2)
    
    this.donateAmount.textContent = `${bchTotal} BCH (${bchCost} ${this.currencyCode})`;
    this.donateAmount.setAttribute("data-satoshis", donationAmount);
    this.donationService.updateAmount(donationAmount)
  }
  
  async toggleSection(visibility = null, section = "providerSection") {
      const donationSection = document.getElementById(section);
  
      //Toggle on if not visible and not setting to false
      if (
        visibility !== false &&
        donationSection.className !== "visible col s12 m12"
      ) {
        
        donationSection.className = "visible col s12 m12";
  
        if (section === "electrumSection") {
          // Make name and comment enabled in case it was disabled as a result of an incomplete previous process.
          this.contributionName.disabled = false;
          this.contributionComment.disabled = false;
        }
  
        // Disable the action button.
        this.donateAmount.disabled = true;
      
      } else {
        
        //Toggle off if visible or setting to false
        donationSection.className = "hidden col s12 m12";
  
        if (section === "providerSection") {
          // Enable the action button.
          this.electrumSection.className = "hidden col s12 m12";
          this.donateButton.disabled = false;
        }
      }
  }

  async parseCommitment(base64text) {

    // Scope the commitment object to allow try-catch.
    let commitmentObject;

    try {

      // Attempt to decode the base64 contribution.
      commitmentObject = JSON.parse(Buffer.from(base64text, 'base64').toString('utf8'));

    } catch (error) {

      // Update form to indicate success and prevent further entry.
      this.statusComponent.showInvalidContributionStatus()

      return "Parsed commitment is not properly structured.";
    }

    // Disable the commit button to prevent confusion.
    this.commitTransaction.disabled = true;

    // Update form to indicate success and prevent further entry.
    this.statusComponent.showParsingContributionStatus()

    //TODO God willing: signature for name and comment for broadcasting integrity
    const contributionName = this.contributionName.value;
    const contributionComment = this.contributionComment.value;

    // Validate that the commitment data matches the expectations.
    // Check that the contribution uses the correct structure.
    if (typeof commitmentObject.inputs === "undefined") {
      // Update form to indicate success and prevent further entry.
      this.statusComponent.showInvalidContributionStatus()
      return "Parsed commitment is not properly structured.";
    }

    // Check that the contribution uses the same name.
    if (commitmentObject.data.alias !== contributionName) {
      // Update form to indicate success and prevent further entry.
      this.statusComponent.showFailedContributionIntentStatus()
      return `Parsed commitments alias '${commitmentObject.data.alias}' does not match the contributors name '${contributionName}'.`;
    }

    // Check that the contribution uses the same comment.
    if (commitmentObject.data.comment !== contributionComment) {
      // Update form to indicate success and prevent further entry.
      this.statusComponent.showFailedContributionIntentStatus()
      return `Parsed commitments alias '${commitmentObject.data.comment}' does not match the contributors comment '${contributionComment}'.`;
    }

    // NOTE: It is not possible to verify the amount without access to the UTXO database.
    // Pass through the intended amount so that verification can happen on backend.
    commitmentObject.data.amount = Number(this.donationAmount.getAttribute("data-satoshis"));

    // Submit the commitment to the backend.
    let submissionStatus = await this.campaignService.contribute(commitmentObject)

    // If UTXO could not be found..
    if (submissionStatus.error) {

      // Update status to let the user know we are retrying the submission.
      this.statusComponent.showRetryingContributionStatus()

      // Wait for a few seconds.
      const sleep = new Promise((resolve) => setTimeout(resolve, 3333));
      await sleep;

      // Resubmit to see if the preparation transaction has properly propagated.
      submissionStatus = await this.campaignService.contribute(commitmentObject)
    }

    // If there was an error we don't understand..
    if (submissionStatus.error) {
      // Parse the error message.
      const errorMessage = submissionStatus.error.message || typeof submissionStatus.error === 'string' ? submissionStatus.error : "An error occured, please try again.";

      // Update form to indicate failure and prevent further entry.
      this.statusComponent.showContributionFailedStatus(errorMessage)

    } else {
      // Reset slider amount.
      this.donateSlider.value = 0.8;

      // Update the input to reflect new amount.
      this.donateSlider.dispatchEvent(new Event("input"));

      const scriptSig = Buffer.from(commitmentObject.inputs[0].unlocking_script, "hex")
      const { pubKey } = bitbox.Script.decodeP2PKHInput(scriptSig)

      let network
      
      if(bitbox.Address.isMainnetAddress(this.campaign.recipients[0].address)) {
          network = 0x05 
      }

      if(bitbox.Address.isTestnetAddress(this.campaign.recipients[0].address)) {
          network = 0x6f 
      }

      const address = bitbox.Address.hash160ToCash(bitbox.Crypto.hash160(pubKey), network)
      
      // Update form to indicate success and prevent further entry.
      this.statusComponent.showSuccessfulContributionStatus(address)
    }
  }

  refresh() {
    // Update the input to reflect the current langauge.
    this.donateSlider.dispatchEvent(new Event("input"));
  }

  activateInputField(event) {
    const targetName = event.target.id;
    const label = document.querySelector(`label[for=${targetName}]`);

    if (document.activeElement === event.target || event.target.value > "") {
        label.className = "active";
    } else {
        label.className = "";
    }
  }
}