import { BITBOX } from 'bitbox-sdk'
import { Buffer } from 'buffer'
import Celebration from './components/celebration.js'
import ContributionsList from './components/contributions.js'
import DonationInput from './components/donations/index.js'
import LanguagePicker from './components/language-picker.js'
import RecipientList from './components/recipients.js'
import Timer from './components/timer.js'
import ProgressBar from './components/progress-bar'

import CampaignService from "./services/campaign.js"
import TranslationService from './services/translations.js'
import EventEmitter from 'events'
import DonationService from './services/donation.js'

const bitbox = new BITBOX()

class flipstarter {
  
  constructor() {  

    this.initialized = new Promise((resolve) => {
      // Once the page is loaded, initialize flipstarter.
      window.addEventListener("load", async () => {

        await this.initialize()
        resolve()

      }, true);
    });
  }

  async initialize() {

    const campaignService = new CampaignService({
      targetFeeRate: 1.5
    })

    await campaignService.init()
        
    // Get the main language from the browser.
    const language = window.navigator.language.slice(0, 2);

    const translationService = new TranslationService(language)
    const donationService = new DonationService()

    new Celebration({
      applause: document.getElementById("applause")
    }, campaignService).init()

    new RecipientList({
      recipientCount: document.getElementById("campaignRecipientCount"),
      recipientList: document.getElementById("recipientList")
    }, campaignService).init()

    new Timer({
      labelElem: document.querySelector("#timerLabel"),
      timerElem: document.querySelector("#campaignExpiration")
    }, campaignService, translationService).init()

    new ProgressBar({
      campaignRequestAmount: document.getElementById("campaignRequestAmount"),
      campaignContributionAmount: document.getElementById("campaignContributionAmount"),
      campaignContributionBar: document.getElementById("campaignContributionBar"),
      campaignProgressBar: document.getElementById("campaignProgressBar")
    }, campaignService, donationService).init()

    new LanguagePicker({
      languages: {
        en: document.getElementById("translateEnglish"),
        zh: document.getElementById("translateChinese"),
        ja: document.getElementById("translateJapanese"),
        es: document.getElementById("translateSpanish")
      },
      languageSelector: document.getElementById("languageSelector"),
    }, translationService).init()

    const contributionsList = new ContributionsList({
      contributionCount: document.getElementById("campaignContributorCount"),
      contributionsList: document.getElementById("contributionList"),
      
      //TODO God willing: handle different types of inputs? like html too.
      emptyContributionsTemplate: document.getElementById("emptyContributionMessage"),
      contributionTemplate: document.getElementById("contributionTemplate")
    }, campaignService)

    const donationInput = new DonationInput({
      donateArea: document.getElementById("donateField"),
      donateStatus: document.getElementById("donateStatus"),
      donateFormContainer: document.getElementById("donateFormContainer"),
      donateSlider: document.getElementById("donationSlider"),
      donateButton: document.getElementById("donateButton"),
      donateText: document.getElementById("donateText"),
      donateAmount: document.getElementById("donationAmount"),
      contributionBar: document.getElementById("campaignContributionBar"),
      
      contributionName: document.getElementById("contributionName"),
      contributionComment: document.getElementById("contributionComment"),
                 
      electrumSection: document.getElementById("electrumSection"),
      providerSection: document.getElementById("providerSection"),

      donationMethods: [
        // {
        //   name: "Electrum",
        //   donator: new ElectrumDonator({
        //     button: document.getElementById("electrumDonateButton"),
        //     commitment: document.getElementById("commitment")
        //   }, campaignService)
        // }, 
        // {
        //   name: "Signup",
        //   donator: new SignupDonation({
        //     button: document.getElementById("signupDonateButton")
        //   }, campaignService)
        // }
      ]

    }, campaignService, translationService, donationService)

    donationInput.init()
    contributionsList.init()

    translationService.on("update", () => {
      donationInput.refresh()
    })
  }
}

// Start the application.
window.flipstarter = new flipstarter();