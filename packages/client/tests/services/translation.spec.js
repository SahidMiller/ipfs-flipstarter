const { expect, test } = require('@jest/globals');
const { TextDecoder, TextEncoder } = require('util');
global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

const { default: TranslationService } = require('../../src/services/translations');

const $ = require('jquery');

describe("translation service", () => {
    
    const testHttpCampaign = {
    }

    test("updates available translations when language is updated", () => {
        document.querySelector('html').innerHTML = ``

        new TranslationService()

        //expect($("#").text()).toEqual()
    })
})