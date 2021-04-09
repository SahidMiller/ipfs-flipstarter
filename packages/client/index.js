// Load the moment library to better manage time.
import moment from "moment"

// Load the locales we will use.
import "moment/locale/en-gb.js"
import "moment/locale/zh-cn.js"
import "moment/locale/ja.js"
import "moment/locale/es.js"

// Load the marked library to parse markdown text,
import unified from "unified"
import markdown from 'remark-parse'
import remark2rehype from 'remark-rehype'
import htmlInMarkdown from 'rehype-raw'
import githubMarkdown from 'remark-gfm'
import html from 'rehype-stringify'

// Load and initialize the DOMPurify library to ensure safety for parsed markdown.
import createDOMPurify from "dompurify"
const DOMPurify = createDOMPurify(window)

// Load the celebratory confetti library.
import confetti from "canvas-confetti"
import { HttpServerConnector } from './server-connector.js'
import { Libp2pServerConnector } from './server-ipfs-connector.js'
import { bitcoinCashUtilities } from '@ipfs-flipstarter/utils'
import { BITBOX } from 'bitbox-sdk'
import { Buffer } from 'buffer'

import Signup from '@dweb-cash/provider'

const signup = new Signup.cash({});
const bitbox = new BITBOX()

const { SATS_PER_BCH, CONTRIBUTOR_MINER_FEE, calculateCampaignerMinerFee } = bitcoinCashUtilities

const interfaceResponses = {
  en: require('../../public/translations/en/interface.json'),
  es: require('../../public/translations/es/interface.json'),
  ja: require('../../public/translations/ja/interface.json'),
  zh: require('../../public/translations/zh/interface.json')
}

function getRequestedSatoshis(campaign) {

  return campaign.recipients.reduce((sum, recipient) => {
    return sum + recipient.satoshis
  }, 0)
}

/**
 * Encodes a string into binary with support for multibyte content.
 *
 * @param string   a unicode (utf16) string to encode.
 * @returns the string encoded in base64.
 */
const base64encode = function (string) {
  const codeUnits = new Uint16Array(string.length);

  for (let i = 0; i < codeUnits.length; i += 1) {
    codeUnits[i] = string.charCodeAt(i);
  }

  return btoa(String.fromCharCode(...new Uint8Array(codeUnits.buffer)));
};

/**
 * Decodes a binary into a string taking care to properly decode multibyte content.
 *
 * @param binary   a base64 encoded string to decode.
 * @returns the binary decoded from base64.
 */
const base64decode = function (binary) {
  return atob(binary);
};

class flipstarter {
  constructor() {
    // Get the main language from the browser.
    const language = window.navigator.language.slice(0, 2);

    // Load the initial translation files in the background.
    this.loadTranslation(language);

    // Once the page is loaded, initialize flipstarter.
    window.addEventListener("load", this.initialize.bind(this));
  }

  async initialize() {
    // Attach event handlers.
    const self = this
    document
      .getElementById("donationSlider")
      .addEventListener("input", this.updateContributionInput.bind(this));
    document
      .getElementById("donateButton")
      .addEventListener("click", () => {
        self.toggleSection(undefined, "providerSection")
      });
    document
      .getElementById("electrumDonateButton")
      .addEventListener("click", () => {
        self.toggleSection(undefined, "electrumSection")
      });
      document
      .getElementById("signupDonateButton")
      .addEventListener("click", this.donateViaSignUp.bind(this));

    document
      .getElementById("template")
      .addEventListener("click", this.copyTemplate.bind(this));
    document
      .getElementById("copyTemplateButton")
      .addEventListener("click", this.copyTemplate.bind(this));
    document
      .getElementById("commitTransaction")
      .addEventListener("click", this.parseCommitment.bind(this));

    //
    document
      .getElementById("contributionName")
      .addEventListener("change", this.updateTemplate.bind(this));
    document
      .getElementById("contributionName")
      .addEventListener("keyup", this.updateTemplate.bind(this));
    document
      .getElementById("contributionComment")
      .addEventListener("change", this.updateTemplate.bind(this));
    document
      .getElementById("contributionComment")
      .addEventListener("keyup", this.updateTemplate.bind(this));

    //
    document
      .getElementById("commitment")
      .addEventListener("change", this.updateCommitButton.bind(this));
    document
      .getElementById("commitment")
      .addEventListener("keyup", this.updateCommitButton.bind(this));
      document
      .getElementById("commitment")
      .addEventListener("onpaste", this.updateCommitButton.bind(this));
    document
      .getElementById("commitment")
      .addEventListener("oninput", this.updateCommitButton.bind(this));
      
    //
    document
      .getElementById("translateEnglish")
      .addEventListener(
        "click",
        this.updateTranslation.bind(this, "en", "English")
      );
    document
      .getElementById("translateChinese")
      .addEventListener(
        "click",
        this.updateTranslation.bind(this, "zh", "Chinese")
      );
    document
      .getElementById("translateJapanese")
      .addEventListener(
        "click",
        this.updateTranslation.bind(this, "ja", "Japanese")
      );
    document
      .getElementById("translateSpanish")
      .addEventListener(
        "click",
        this.updateTranslation.bind(this, "es", "Spanish")
      );

    // Fetch the campaign information from the backend.
    this.campaign = await (await fetch('campaign.json')).json()

    //Initialize campaign variables
    this.campaign.requestedSatoshis = getRequestedSatoshis(this.campaign)
    this.campaign.campaignMinerFee = calculateCampaignerMinerFee(this.campaign.recipients.length)

    //TODO Error if nothing is set?
    if (this.campaign.apiType === "ipfs") {
      this.server = new Libp2pServerConnector()
    } else {
      this.server = new HttpServerConnector() 
    }

    // Get the main language from the browser.
    const language = window.navigator.language.slice(0, 2);

    // Wait for currency rates to be loaded..
    await this.loadCurrencyRates();

    // Apply website translation (or load website content).
    await this.applyTranslation(language);

    // Update the campaign status and timer.
    this.updateTimerPresentation();

    // Update the timer every second.
    setInterval(this.updateExpiration.bind(this), 1000);
    
    this.updateRecipientCount(this.campaign.recipients.length);
    this.updateCampaignProgressCounter();

    // Add each recipient to the fundraiser.
    this.campaign.recipients.forEach(recipient => {
      const amount = recipient.satoshis / SATS_PER_BCH
      const recipientAmount = Number(amount).toLocaleString();

      document.getElementById(
        "recipientList"
      ).innerHTML += `<li class='col s6 m6 l12'>
				<a href='${recipient.url}' target="_blank">
					<img src='${recipient.image}' alt='${recipient.alias}' />
					<span>
						<b>${recipient.alias}</b>
						<i title="${recipient.satoshis}">${recipientAmount} BCH</i>
					</span>
				</a>
			</li>`;
    })

    // Update the input to reflect the current langauge.
    document.getElementById("donationSlider").dispatchEvent(new Event("input"));

    // Initialize the language selector.
    
    // Fetch the DOM element.
    const languageSelector = document.getElementById("languageSelector");

    // Create a function to show the language selector options.
    const showLanguageOptions = function () {
      languageSelector.className = "fixed-action-btn active";
    };

    // Create a function to hide the language selector options.
    const hideLanguageOptions = function () {
      languageSelector.className = "fixed-action-btn";
    };

    // Add mouse over and mouse out events.
    languageSelector.addEventListener("mouseover", showLanguageOptions);
    languageSelector.addEventListener("mouseout", hideLanguageOptions);

    //
    const activateInputField = function (event) {
      const targetName = event.target.id;
      const label = document.querySelector(`label[for=${targetName}]`);

      if (document.activeElement === event.target || event.target.value > "") {
        label.className = "active";
      } else {
        label.className = "";
      }
    };

    const contributionNameInput = document.getElementById("contributionName");
    const contributionCommentInput = document.getElementById("contributionComment");

    contributionNameInput.addEventListener("focus", activateInputField);
    contributionNameInput.addEventListener("blur", activateInputField);
    contributionCommentInput.addEventListener("focus", activateInputField);
    contributionCommentInput.addEventListener("blur", activateInputField);

    let initialTimestamp = moment().unix()

    const updateCampaign = (async function (campaign) {
      this.campaign = campaign

      // Special case: fullfillment.
      if (this.campaign.fullfilled && this.campaign.fullfillmentTimestamp > initialTimestamp) {

        //Don't play again.
        initialTimestamp = moment.unix()

        // Trigger celebration.
        celebration(0.11);
      }

      // .. update the contribution list.
      this.updateContributionList();

      // .. update the progress bar and contribution amount
      // .. include base campaign miner fee to cover output costs (contributors handle their own inputs, God willing)
      const requestedSatoshis = (this.campaign.requestedSatoshis || 0) + (this.campaign.campaignMinerFee || 0)
      const committedSatoshis = (this.campaign.committedSatoshis || 0) - (this.campaign.totalCommittedMinerFees || 0)

      const contributionAmount =  (committedSatoshis / SATS_PER_BCH).toFixed(8)
      const contributionBar = (100 * (committedSatoshis / requestedSatoshis)).toFixed(2)
      
      // .. move the current contribution bar accordingly.
      //This may not be right, on update, move the other guys stuff, God willing
      document.getElementById("campaignContributionAmount").textContent = DOMPurify.sanitize(contributionAmount);
      document.getElementById("campaignContributionBar").style.left = contributionBar + "%";
      document.getElementById("campaignProgressBar").style.width = contributionBar + "%";

      this.updateTimerPresentation()

    }).bind(this);

    this.server.on('update', updateCampaign)
    await this.server.listen(this.campaign)
    updateCampaign(this.campaign)
  }

  showFullfilledStatus(fullfillmentTx) {
    // Check if we already have a fullfillment status message..
    const donateField = document.getElementById("donateField");
    const fullfilled = donateField.className.indexOf("fullfilled") !== -1;

    if (fullfilled) {
      return
    }
    
    // Mark the campaign as fullfilled which prevents form entry.
    this.updateStatus("fullfilled", "statusFullfilled", this.translation["statusFullfilled"]);

    // Add interactive content to the status message.
    let sharingActions = "";
    sharingActions +=
      "<div id=\"sharingActions\" style=\"font-size: 1rem; opacity: 0.66;\">";
    if (typeof navigator.share === "function") {
      sharingActions += `<a id='shareAction' data-string='shareAction'><i class="icon-share"></i>${this.translation["shareAction"]}</a>`;
    }
    sharingActions += `<a id='celebrateAction' data-string='celebrateAction'><i class="icon-nightlife"></i>${this.translation["celebrateAction"]}</a>`;
    sharingActions += `<a id='fullfillmentLink' target='_blank' href='https://blockchair.com/bitcoin-cash/transaction/${fullfillmentTx}'><i class="icon-label"></i>${fullfillmentTx}</a>`;
    sharingActions += "</div>";
    document.getElementById("donateStatus").innerHTML += sharingActions;

    // Make the celebrate action clickable to trigger celebration effects.
    document
      .getElementById("celebrateAction")
      .addEventListener("click", celebration.bind(this, 0.75));

    // Make the share action clickabe to trigger sharing of the current url.
    if (typeof navigator.share === "function") {
      const shareUrl = function (url) {
        navigator.share({
          title: this.translation["shareTitle"],
          text: this.translation["shareText"],
          url: url,
        });
      };

      document
        .getElementById("shareAction")
        .addEventListener("click", shareUrl.bind(this, window.location.href));
    }

    // Change expiration to fullfillment counter.
    const timerElement = document.getElementById("timerLabel");
    timerElement.setAttribute("data-string", "fullfilledLabel");
    timerElement.textContent = this.translation["fullfilledLabel"];
  }

  updateTimerPresentation() {
    // If this campaign has already been fullfilled..
    if (this.campaign.fullfillmentTimestamp > 0) {
      this.showFullfilledStatus(this.campaign.fullfillmentTx);
    }
    // If this campaign has not yet started.
    else if (this.campaign.starts > moment().unix()) {
      // Mark the campaign as pending, which prevents form entry.
      this.updateStatus(null, "statusPending", this.translation["statusPending"]);

      // Change expiration to pending counter.
      const timerElement = document.getElementById("timerLabel");
      timerElement.setAttribute("data-string", "pendingLabel");
      timerElement.textContent = this.translation["pendingLabel"];

      // Automatically update campaign status 500ms after campaign starts.
      setTimeout(
        this.updateTimerPresentation.bind(this),
        (this.campaign.starts - moment().unix()) * 1000 + 500
      );
    }
    // If this campaign has already expired.
    else if (this.campaign.expires < moment().unix()) {
      // Change expiration to already expired counter.
      const timerElement = document.getElementById("timerLabel");
      timerElement.setAttribute("data-string", "expiredLabel");
      timerElement.textContent = this.translation["expiredLabel"];

      // Mark the campaign as expired, which prevents form entry.
      this.updateStatus(null, "statusExpired", this.translation["statusExpired"]);

    } else if (typeof this.campaign.active === "undefined") {
      // Mark the campaign as active.
      this.campaign.active = true;

      // Change expiration to active campaign counter..
      const timerElement = document.getElementById("timerLabel");
      timerElement.setAttribute("data-string", "expiresLabel");
      timerElement.textContent = this.translation["expiresLabel"];

      // Hide the status message.
      this.hideStatus();

      // Show the campaign input form.
      document.getElementById("donateForm").className = "col s12 m12 l12";

      // Automatically update campaign status 500ms after campaign ends.
      setTimeout(
        this.updateTimerPresentation.bind(this),
        (this.campaign.expires - moment().unix()) * 1000 + 500
      );
    }
  }

  async updateContributionList() {
    const contributionListElement = document.getElementById("contributionList");

    // Empty the contribution list.
    contributionListElement.textContent = "";

    // Update the contribution counter.

    document.getElementById("campaignContributorCount").textContent = this.campaign.commitmentCount || 0;

    if (this.campaign.commitmentCount === 0) {
      // Get the empty message template node.
      const template = document.getElementById("emptyContributionMessage").content.firstElementChild;

      // Import a copy of the template.
      const contributionMessage = document.importNode(template, true);

      // Add the copy to the contribution list.
      contributionListElement.appendChild(contributionMessage);

    } else {
      
      //Base percentage from full value including output fees
      const requestedSatoshis = (this.campaign.requestedSatoshis || 0) + (this.campaign.campaignMinerFee || 0)

      //Display minus fees to reflect satoshis to campaign recipients rather than full contract (until completed)
      const contributorFees = !this.campaign.fullfilled ? CONTRIBUTOR_MINER_FEE : 0

      this.campaign.contributions
        .slice()
        .sort((a, b) => Number(b.satoshis) - Number(a.satoshis))
        .forEach(commitment => {
          //Base percentage from commitment minus standard fees, God willing
          this.addContributionToList(
            commitment.alias,
            commitment.comment,
            (commitment.satoshis - contributorFees),
            (commitment.satoshis - contributorFees) / requestedSatoshis
          )
        })
    }
  }

  async loadCurrencyRates() {
    try {
      // request the currency rates.
      const currencyRatesResponse = fetch("https://bitpay.com/api/rates/BCH");

      // Store the current rates.
      this.currencyRates = await (await currencyRatesResponse).json();
    
    } catch (error) {
      // request the currency rates.
      const currencyRatesResponse = fetch("https://markets.api.bitcoin.com/rates?c=BCH");

      // Store the current rates.
      this.currencyRates = await (await currencyRatesResponse).json();
    }
  }

  async updateTranslation(locale = "en") {
    // Hide the language selector.
    document.getElementById("languageSelector").className = "fixed-action-btn";

    // Load the new translation.
    this.loadTranslation(locale);

    // Update the rendered translation.
    await this.applyTranslation(locale);

    // Update the input to reflect the current langauge.
    document.getElementById("donationSlider").dispatchEvent(new Event("input"));
  }

  async loadTranslation(locale = "en") {
    // Set default language.
    let languageCode = "en";

    // Make a list of availabe languages.
    const availableLanguages = {
      en: true,
      zh: true,
      ja: true,
      es: true,
    };

    // If the requested language has a translation..
    if (typeof availableLanguages[locale] !== "undefined") {
      // Overwrite the default language with the users langauge code.
      languageCode = locale;
    }
  }

  async applyTranslation(locale = "en") {
    // Set default language.
    let languageCode = "en";
    let languageCurrencyCode = "USD";

    // Make a list of supported translations.
    const languages = {
      en: "English",
      zh: "Chinese",
      ja: "Japanese",
      es: "Spanish",
    };

    // Make a list of moment locales to use for each language.
    const momentLocales = {
      en: "en-gb",
      zh: "zh-cn",
      ja: "ja",
      es: "es",
    };

    // Make a list of currencies to use for each language.
    const currencies = {
      en: "USD",
      zh: "CNY",
      ja: "JPY",
      es: "EUR",
    };

    // If the requested language has a translation..
    if (typeof languages[locale] !== "undefined") {
      // Overwrite the default language.
      languageCode = locale;
      languageCurrencyCode = currencies[locale];
    }

    // Update the HTML language reference.
    document.getElementsByTagName("html")[0].setAttribute("lang", languageCode);

    // Store the current code and exchange rate.
    this.currencyCode = languageCurrencyCode;
    this.currencyValue = this.currencyRates.find((obj) => obj.code === currencies[languageCode]).rate;

    // Print out the campaign texts.
    const processor = unified()
      .use(githubMarkdown)
      .use(markdown)
      .use(remark2rehype, {allowDangerousHtml: true})
      .use(htmlInMarkdown)
      .use(html)
    document.getElementById("campaignAbstract").innerHTML = DOMPurify.sanitize(await processor.process(this.campaign.descriptions[languageCode].abstract));
    document.getElementById("campaignDetails").innerHTML = DOMPurify.sanitize(await processor.process(this.campaign.descriptions[languageCode].proposal));
    
    //TODO God willing: find better way to remove ugly disabled css
    document.querySelectorAll(".task-list-item input[checked]").forEach(i => i.disabled = false)

    // Parse the interface translation.
    this.translation = interfaceResponses[languageCode]

    // Fetch all strings to be translated.
    const stringElements = document.body.querySelectorAll("*[data-string]");

    // For each element..
    for (const index in stringElements) {

      if (typeof stringElements[index] === "object") {
        // Get the translation string key.
        const key = stringElements[index].getAttribute("data-string");

        // TODO: Look up the translation from a translation table.
        const value = this.translation[key];

        // Print out the translated value.
        stringElements[index].textContent = value;
      }
    }

    // Fetch all placeholders to be translated.
    const placeholderElements = document.body.querySelectorAll("*[data-placeholder]");

    // For each element..
    for (const index in placeholderElements) {

      if (typeof placeholderElements[index] === "object") {
        // Get the translation string key.
        const key = placeholderElements[index].getAttribute("data-placeholder");

        // TODO: Look up the translation from a translation table.
        const value = this.translation[key];

        // Print out the translated value.
        placeholderElements[index].setAttribute("placeholder", value);
      }
    }

    // Fetch all templates to be translated.
    const templates = document.body.querySelectorAll("template");

    // For each template..
    for (const templateIndex in templates) {

      if (typeof templates[templateIndex].content !== "undefined") {
        // Fetch all elements to be translated.
        const templateElements = templates[templateIndex].content.querySelectorAll("*[data-string]");

        for (const index in templateElements) {

          if (typeof templateElements[index] === "object") {
            // Get the translation string key.
            const key = templateElements[index].getAttribute("data-string");

            // TODO: Look up the translation from a translation table.
            const value = this.translation[key];

            // Print out the translated value.
            templateElements[index].textContent = value;
          }
        }
      }
    }

    // Change moment to use the new locale.
    moment.locale(momentLocales[languageCode]);
  }

  async copyTemplate() {
    // Disable the name and comment inputs.
    document.getElementById("contributionName").disabled = true;
    document.getElementById("contributionComment").disabled = true;

    // Locate the template input elements.
    const templateTextArea = document.getElementById("template");
    const templateButton = document.getElementById("copyTemplateButton");

    // Select the template text.
    templateTextArea.select();
    templateTextArea.setSelectionRange(0, 99999);

    // Copy the selection to the clipboard.
    document.execCommand("copy");

    // Deselect the text.
    templateTextArea.setSelectionRange(0, 0);

    // Notify user that the template has been copied by changing the button appearance..
    templateButton.textContent = "Done";
    templateButton.disabled = "disabled";
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
        document.getElementById("contributionName").disabled = false;
        document.getElementById("contributionComment").disabled = false;
      }

      // Disable the action button.
      document.getElementById("donateButton").disabled = true;
    
    } else {
      
      //Toggle off if visible or setting to false
      donationSection.className = "hidden col s12 m12";

      if (section === "providerSection") {
        // Enable the action button.
        document.getElementById("electrumSection").className = "hidden col s12 m12";
        document.getElementById("donateButton").disabled = false;
      }
    }
  }

  async updateCampaignProgressCounter() {
    const requestedSatoshis = this.campaign.requestedSatoshis
    const requestedSatoshisText = (requestedSatoshis / SATS_PER_BCH).toFixed(8)
    document.getElementById("campaignRequestAmount").textContent = DOMPurify.sanitize(requestedSatoshisText);
  }

  async updateExpiration() {
    // If the campaign has been fullfilled..
    if (this.campaign.fullfillmentTimestamp > 0) {
      // Count from fullfillment..
      document.getElementById("campaignExpiration").textContent = moment().to(moment.unix(this.campaign.fullfillmentTimestamp));
    }
    // If the campaign has been not yet started..
    else if (this.campaign.starts > moment().unix()) {
      // Count from starting.
      document.getElementById("campaignExpiration").textContent = moment().to(moment.unix(this.campaign.starts));
    } else {
      // Count from expiration.
      document.getElementById("campaignExpiration").textContent = moment().to(moment.unix(this.campaign.expires));
    }
  }

  async updateRecipientCount(recipientCount) {
    document.getElementById("campaignRecipientCount").textContent = recipientCount;
  }

  async updateCommitButton() {
    if (document.getElementById("commitment").value === document.getElementById("template").value) {

      document.getElementById("commitment").style.outline = "2px dotted red";
      document.getElementById("template").style.outline = "2px dotted red";

      // Keep the button disabled as this is not a valid pledge.
      document.getElementById("commitTransaction").disabled = true;
    
    } else {
      
      document.getElementById("commitment").style.outline = "none";
      document.getElementById("template").style.outline = "none";

      // Enable the button if there is content in the pledge textarea.
      document.getElementById("commitTransaction").disabled = document.getElementById("commitment").value === "";
    }
  }

  async updateTemplate() {
    // Locate the template input elements.
    const templateTextArea = document.getElementById("template");
    const templateButton = document.getElementById("copyTemplateButton");
    const title = document.getElementById("campaignTitle");

    // Display campaign title
    title.innerHTML = this.campaign.title;

    //
    templateButton.textContent = this.translation["copyButton"];
    templateButton.disabled = null;

    // Get the number of satoshis the user wants to donate.
    const satoshis = document.getElementById("donationAmount").getAttribute("data-satoshis");

    // If the user wants to donate some satoshis..
    if (satoshis) {
      // Assemble the request object.
      let requestObject = {
        outputs: [],
        data: {
          alias: document.getElementById("contributionName").value,
          comment: document.getElementById("contributionComment").value,
        },
        donation: {
          amount: Number(satoshis),
        },
        expires: this.campaign.expires,
      };

      // For each recipient..
      for (const recipientIndex in this.campaign.recipients) {
        const outputValue = this.campaign.recipients[recipientIndex].satoshis;
        const outputAddress = this.campaign.recipients[recipientIndex].address;

        // Add the recipients outputs to the request.
        requestObject.outputs.push({ value: outputValue, address: outputAddress });
      }

      // Assemble an assurance request template.
      const templateString = base64encode(JSON.stringify(requestObject));

      // Update the website template string.
      templateTextArea.textContent = templateString;
    } else {
      // Update the website template string.
      templateTextArea.textContent = "";
    }
  }

  async updateContributionInput(event) {
    let donationAmount;

    const committedSatoshis = (this.campaign.committedSatoshis || 0) - (this.campaign.totalCommittedMinerFees || 0)
    const requestedSatoshis = this.campaign.requestedSatoshis + this.campaign.campaignMinerFee

    // Hide donation section.
    this.toggleSection(false, "providerSection");

    // Enable the action button.
    document.getElementById("donateButton").disabled = false;

    const percentage = parseFloat(event.target.value) / 100
    if (Number(event.target.value) <= 1) {
      // Reset metadata.
      document.getElementById("contributionName").value = "";
      document.getElementById("contributionComment").value = "";

      // Disable the action button.
      document.getElementById("donateButton").disabled = true;

      // Set amount to 0.
      donationAmount = 0;

    } else {

      //Add per contribution fee to donation amount, God willing
      donationAmount = CONTRIBUTOR_MINER_FEE + Math.ceil((requestedSatoshis - committedSatoshis) * percentage);
    }

    if (Number(event.target.value) >= 100) {
      
      document.getElementById("donateText").textContent = this.translation["fullfillText"];
    
    } else {

      document.getElementById("donateText").textContent = this.translation["donateText"];
    }
    
    const contributionBarOffset = (100 * (committedSatoshis / requestedSatoshis)).toFixed(2)
    const contributionBarWidth = (event.target.value * (1 - committedSatoshis / requestedSatoshis)).toFixed(2)

    document.getElementById("campaignContributionBar").style.left = contributionBarOffset + "%";
    document.getElementById("campaignContributionBar").style.width = contributionBarWidth + "%";
    
    const bchTotal = (donationAmount / SATS_PER_BCH).toLocaleString()
    const bchCost = (this.currencyValue * (donationAmount / SATS_PER_BCH)).toFixed(2)
    
    document.getElementById("donationAmount").textContent = `${bchTotal} BCH (${bchCost} ${this.currencyCode})`;
    document.getElementById("donationAmount").setAttribute("data-satoshis", donationAmount);

    // Update the template text.
    this.updateTemplate();
  }
 
  async donateViaSignUp() {

    try {
      // Get the number of satoshis the user wants to donate.
      const satoshis = document.getElementById("donationAmount").getAttribute("data-satoshis");

      // If the user wants to donate some satoshis..
      if (satoshis) {

        let recipients = []

        // For each recipient..
        for (const recipientIndex in this.campaign.recipients) {
          const outputValue = this.campaign.recipients[recipientIndex].satoshis;
          const outputAddress = this.campaign.recipients[recipientIndex].address;

          // Add the recipients outputs to the request.
          recipients.push({ value: outputValue, address: outputAddress });
        }

        const { payload } = await signup.contribute(Number(satoshis), "SAT", {
          title: this.campaign.title,
          expires: this.campaign.expires,
          alias: document.getElementById("contributionName").value,
          comment: document.getElementById("contributionComment").value,
          includingFee: CONTRIBUTOR_MINER_FEE
        }, recipients);

        document.getElementById("commitment").value = payload
        this.parseCommitment()
      }         

    } catch (err) {

      if (err && err.status === 'ERROR') {
        console.log(err.message)
      }
    }
  }

  /**
   *
   */
  async parseCommitment() {
    //
    const base64text = document.getElementById("commitment").value;

    // Scope the commitment object to allow try-catch.
    let commitmentObject;

    try {

      // Attempt to decode the base64 contribution.
      commitmentObject = JSON.parse(base64decode(base64text));

    } catch (error) {

      // Update form to indicate success and prevent further entry.
      this.updateStatus("failed", "statusFailedStructure", this.translation["statusFailedStructure"]);
      return "Parsed commitment is not properly structured.";
    }

    // Disable the commit button to prevent confusion.
    document.getElementById("commitTransaction").disabled = true;

    // Update form to indicate success and prevent further entry.
    this.updateStatus("pending", "statusParsing", this.translation["statusParsing"]);

    const contributionName = document.getElementById("contributionName").value;
    const contributionComment = document.getElementById("contributionComment").value;

    // Validate that the commitment data matches the expectations.
    // Check that the contribution uses the correct structure.
    if (typeof commitmentObject.inputs === "undefined") {
      // Update form to indicate success and prevent further entry.
      this.updateStatus("failed", "statusFailedStructure", this.translation["statusFailedStructure"]);
      return "Parsed commitment is not properly structured.";
    }

    // Check that the contribution uses the same name.
    if (commitmentObject.data.alias !== contributionName) {
      // Update form to indicate success and prevent further entry.
      this.updateStatus("failed", "statusFailedIntent", this.translation["statusFailedIntent"]);
      return `Parsed commitments alias '${commitmentObject.data.alias}' does not match the contributors name '${contributionName}'.`;
    }

    // Check that the contribution uses the same comment.
    if (commitmentObject.data.comment !== contributionComment) {
      // Update form to indicate success and prevent further entry.
      this.updateStatus("failed", "statusFailedIntent", this.translation["statusFailedIntent"]);
      return `Parsed commitments alias '${commitmentObject.data.comment}' does not match the contributors comment '${contributionComment}'.`;
    }

    // NOTE: It is not possible to verify the amount without access to the UTXO database.
    // Pass through the intended amount so that verification can happen on backend.
    commitmentObject.data.amount = Number(document.getElementById("donationAmount").getAttribute("data-satoshis"));

    // Submit the commitment to the backend.
    let submissionStatus = await this.server.contribute(commitmentObject)

    // If UTXO could not be found..
    if (submissionStatus.error) {

      // Update status to let the user know we are retrying the submission.
      this.updateStatus("pending", "statusRetrying", this.translation["statusRetrying"]);

      // Wait for a few seconds.
      const sleep = new Promise((resolve) => setTimeout(resolve, 3333));
      await sleep;

      // Resubmit to see if the preparation transaction has properly propagated.
      let submissionStatus = await this.server.contribute(commitmentObject)
    }

    // If there was an error we don't understand..
    if (submissionStatus.error) {
      // Parse the error message.
      const errorMessage = submissionStatus.error.message || typeof submissionStatus.error === 'string' ? submissionStatus.error : "An error occured, please try again.";

      // Update form to indicate failure and prevent further entry.
      this.updateStatus("failed", "statusFailedUnkown", this.translation["statusFailedUnknown"] + `<br/><qoute>${errorMessage}</qoute>`);

    } else {
      // Reset slider amount.
      document.getElementById("donationSlider").value = 0.8;

      // Update the input to reflect new amount.
      document.getElementById("donationSlider").dispatchEvent(new Event("input"));

      // Update form to indicate success and prevent further entry.
      this.updateStatus(null, "statusContribution", this.translation["statusContribution"]);

      //Show the reward link

      if (this.campaign.rewardUrl && typeof (this.campaign.rewardUrl) === 'string') {
        //TODO God willing: replace certain parts of url, God willing.
        const scriptSig = Buffer.from(commitmentObject.inputs[0].unlocking_script, "hex")
        const { pubKey } = bitbox.Script.decodeP2PKHInput(scriptSig)
        //TODO God willing: testnet regnet check

        let network
        
        if(bitbox.Address.isMainnetAddress(this.campaign.recipients[0].address)) {
          network = 0x05 
        }

        if(bitbox.Address.isTestnetAddress(this.campaign.recipients[0].address)) {
          network = 0x6f 
        }

        const address = bitbox.Address.hash160ToCash(bitbox.Crypto.hash160(pubKey), network)
        const result = this.campaign.rewardUrl.replace("${address}", address)
        document.getElementById("donateReward").className = "col s12 m12 l12"
        document.getElementById("claimRewardLink").setAttribute("href", result)
      }
    }
  }

  updateStatus(type, label, content) {
    const donateField = document.getElementById("donateField");
    const donateStatus = document.getElementById("donateStatus");
    const donateForm = document.getElementById("donateForm");
    const providerSection = document.getElementById("providerSection");
    const electrumSection = document.getElementById("electrumSection");

    // Check if we already have a fullfillment status message..
    const fullfillmentStatus = donateField.className === "row fullfilled";

    // Only update status if we're not fullfilled..
    if (!fullfillmentStatus) {
      // Set the fieldset type.
      donateField.className = `row ${type}`;

      // Hide form and section.
      donateForm.className = "col s12 m12 l12 hidden";
      electrumSection.className = "col s12 m12 l12 hidden";
      providerSection.className = "col s12 m12 l12 hidden";

      // Add status content.
      donateStatus.setAttribute("data-string", label);
      donateStatus.innerHTML = content;

      // Show status.
      donateStatus.className = "col s12 m12 l12";
    }
  }

  hideStatus() {
    // Locate the status element.
    const donateStatus = document.getElementById("donateStatus");

    // Hide status.
    donateStatus.className = "col s12 m12 l12 hidden";
    donateStatus.textContent = "";
  }

  addContributionToList(alias, comment, amount, percent) {
    // Get the contribution list.
    const contributionList = document.getElementById("contributionList");

    // Get the template node.
    const template = document.getElementById("contributionTemplate").content.firstElementChild;

    // Import a copy of the template.
    const contributionEntry = document.importNode(template, true);

    // Calculate water level and randomize animation delay.
    const backgroundMin = 0.1;
    const backgroundMax = 3.5;
    const backgroundPosition = (backgroundMin + backgroundMax * (1 - percent)).toFixed(2);
    const animationLength = 15;
    const animationDelay = (Math.random() * animationLength).toFixed(2);
    const contributionAmount = (amount / SATS_PER_BCH).toFixed(8);

    // Update the data on the copy.
    contributionEntry.querySelector(".contributionWaves").style.backgroundPosition = `0 ${backgroundPosition}rem`;
    contributionEntry.querySelector(".contributionWaves").style.animationDelay = `-${animationDelay}s`;
    contributionEntry.querySelector(".contributionPercent").textContent = (percent * 100).toFixed(0) + "%";
    contributionEntry.querySelector(".contributionAlias").textContent = alias;
    contributionEntry.querySelector(".contributionComment").textContent = DOMPurify.sanitize(comment, { ALLOWED_TAGS: [] });
    contributionEntry.querySelector(".contributionAmount").textContent = `${contributionAmount} BCH`;

    // Hide the comment if not existing.
    if (comment === "") {
      contributionEntry.querySelector(".contributionComment").style.display = "none";
    }

    // Mark username as anonymous if not existing.
    if (alias === "") {
      contributionEntry.querySelector(".contributionAlias").style.opacity = 0.37;
      contributionEntry.querySelector(".contributionAlias").textContent = "Anonymous";
    }

    // Add the copy to the contribution list.
    contributionList.appendChild(contributionEntry);
  }
}

// Start the application.
window.flipstarter = new flipstarter();

// Function that can be used to cause celebratory effects.
const celebration = function (volume = 0.11) {
  // Let the confetti burst in like fireworks!
  let fireworks = function () {
    // Left side of the screen.
    const leftConfetti = {
      particleCount: 50,
      angle: 60,
      spread: 90,
      origin: { x: 0 },
    };

    // Right side of the screen.
    const rightConfetti = {
      particleCount: 50,
      angle: 120,
      spread: 90,
      origin: { x: 1 },
    };

    // Trigger the confetti.
    confetti(leftConfetti);
    confetti(rightConfetti);
  };

  // Adjust volume to prevent heartattacks.
  document.getElementById("applause").volume = volume;

  // NOTE: https://gitlab.com/flipstarter/frontend/-/issues/64
  // Wrap audio play function in try-catch clause to prevent
  // abrupt halt of execution in case user has not yet interacted.
  try {
    // Play the sound effect.
    document.getElementById("applause").play();
  } catch (error) {
    // Do nothing.
  }

  // Burst multiple times with some delay.
  window.setTimeout(fireworks, 100);
  window.setTimeout(fireworks, 200);
  window.setTimeout(fireworks, 400);
  window.setTimeout(fireworks, 500);
  window.setTimeout(fireworks, 700);
};
