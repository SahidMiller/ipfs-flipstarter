import EventEmitter from 'events'

// Load the moment library to better manage time.
import moment from "moment"

// Load the locales we will use.
import "moment/locale/en-gb.js"
import "moment/locale/zh-cn.js"
import "moment/locale/ja.js"
import "moment/locale/es.js"

const translations = {
    en: require('../../../../public/translations/en/interface.json'),
    es: require('../../../../public/translations/es/interface.json'),
    ja: require('../../../../public/translations/ja/interface.json'),
    zh: require('../../../../public/translations/zh/interface.json')
}

export default class TranslationService extends EventEmitter {
    constructor(languageCode = "en") {
        super()
        this.updateLanguage(languageCode)
    }

    get(key) {
        const translation = this.languageCode ? translations[this.languageCode] || {} : {}
        return translation[key]
    }

    updateLanguage(key = "en") {
        if (!translations[key]) {
            return
        }

        this.languageCode = key

        // Update the HTML language reference.
        document.getElementsByTagName("html")[0].setAttribute("lang", this.languageCode);

        this.updateMomentLocale()
        this.updateTextTranslations()
        this.updatePlaceholderTranslations()
        this.updateTemplateTranslations()

        this.emit('update', this.languageCode)
    }

    updateMomentLocale() {
        // Make a list of moment locales to use for each language.
        const momentLocales = {
            en: "en-gb",
            zh: "zh-cn",
            ja: "ja",
            es: "es",
        };

        // Change moment to use the new locale.
        moment.locale(momentLocales[this.languageCode]);
    }

    updateTextTranslations() {
        // Fetch all strings to be translated.
        const stringElements = document.body.querySelectorAll("*[data-string]");

        // For each element..
        for (const index in stringElements) {

            if (typeof stringElements[index] === "object") {
            // Get the translation string key.
            const key = stringElements[index].getAttribute("data-string");

            const value = this.get(key);

            // Print out the translated value.
            stringElements[index].textContent = value;
            }
        }
    }

    updatePlaceholderTranslations() {
        // Fetch all placeholders to be translated.
        const placeholderElements = document.body.querySelectorAll("*[data-placeholder]");

        // For each element..
        for (const index in placeholderElements) {

            if (typeof placeholderElements[index] === "object") {
            // Get the translation string key.
            const key = placeholderElements[index].getAttribute("data-placeholder");

            const value = this.get(key);

            // Print out the translated value.
            placeholderElements[index].setAttribute("placeholder", value);
            }
        }
    }

    updateTemplateTranslations() {

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
                        const value = this.get(key);

                        // Print out the translated value.
                        templateElements[index].textContent = value;
                    }
                }
            }
        }        
    }
}