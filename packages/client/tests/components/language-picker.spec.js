const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const { default: LanguagePicker } = require('../../src/components/language-picker');

const $ = require('jquery');

describe("language picker", () => {
    
    const testHttpCampaign = {
    }

    test("updates available translations when language is updated", () => {
        document.querySelector('html').innerHTML = `
        <div id="languageSelector">
          <b id="currentLanguage" data-string="changeLanguage"></b>
          <ul>
            <li><a id="translateEnglish">En</a></li>
            <li><a id="translateChinese">Cn</a></li>
            <li><a id="translateJapanese">Ja</a></li>
            <li><a id="translateSpanish">Es</a></li>
          </ul>
        </div>`

        const translationService = {
            get: jest.fn(),
            updateLanguage: jest.fn()
        }

        new LanguagePicker({
            languages: {
              en: document.getElementById("translateEnglish"),
              zh: document.getElementById("translateChinese"),
              ja: document.getElementById("translateJapanese"),
              es: document.getElementById("translateSpanish")
            },
            languageSelector: document.getElementById("languageSelector"),
        }, translationService).init()

        expect($("#languageSelector").hasClass("active")).toBeFalsy()

        document.getElementById("languageSelector").dispatchEvent(new Event("mouseover"));
        expect($("#languageSelector").hasClass("active")).toBeTruthy()

        document.getElementById("languageSelector").dispatchEvent(new Event("mouseout"));
        expect($("#languageSelector").hasClass("active")).toBeFalsy()

        document.getElementById("translateChinese").dispatchEvent(new Event("click"));
        expect(translationService.updateLanguage).toHaveBeenCalledWith("zh", expect.anything())
        
        document.getElementById("translateJapanese").dispatchEvent(new Event("click"));
        expect(translationService.updateLanguage).toHaveBeenCalledWith("ja", expect.anything())

        document.getElementById("translateSpanish").dispatchEvent(new Event("click"));
        expect(translationService.updateLanguage).toHaveBeenCalledWith("es", expect.anything())

        document.getElementById("translateEnglish").dispatchEvent(new Event("click"));
        expect(translationService.updateLanguage).toHaveBeenCalledWith("en", expect.anything())
        
        //expect($("#").text()).toEqual()
    })
})