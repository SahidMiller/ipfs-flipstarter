const { expect, test } = require('@jest/globals');
const EventEmitter = require('events');
const { TextDecoder, TextEncoder } = require('util')

global.TextDecoder = TextDecoder
global.TextEncoder = TextEncoder

jest.mock('../src/components/celebration.js')
jest.mock('../src/components/contributions.js')
jest.mock('../src/components/donations/index.js')
jest.mock('../src/components/language-picker.js')
jest.mock('../src/components/recipients.js')
jest.mock('../src/components/timer.js')

jest.mock('../src/services/campaign.js')
jest.mock('../src/services/translations.js')

const { default: Celebration } = require('../src/components/celebration.js')
const { default: ContributionsList } = require('../src/components/contributions.js')
const { default: DonationInput } = require('../src/components/donations/index.js')
const { default: LanguagePicker } = require('../src/components/language-picker.js')
const { default: RecipientList } = require('../src/components/recipients.js')
const { default: Timer } = require('../src/components/timer.js')

const { default: CampaignService } = require("../src/services/campaign.js")
const { default: TranslationService } = require('../src/services/translations.js')

const translationService = new EventEmitter()
translationService.get = jest.fn()
TranslationService.mockImplementation(() => {
    return translationService
})

describe("ui", () => {
    
    //Run src file
    require('../src')

    test("should call appropriate components", async () => {
        document.querySelector('html').innerHTML = require("./utils/fixture")


        await window.flipstarter.initialized

        expect(TranslationService).toHaveBeenCalled()
        expect(CampaignService).toHaveBeenCalled()

        expect(Celebration).toHaveBeenCalled()
        expect(ContributionsList).toHaveBeenCalled()
        expect(DonationInput).toHaveBeenCalled()
        expect(LanguagePicker).toHaveBeenCalled()
        expect(RecipientList).toHaveBeenCalled()
        expect(Timer).toHaveBeenCalled()

        expect(CampaignService.mock.instances[0].init).toHaveBeenCalled()

        expect(Celebration.mock.instances[0].init).toHaveBeenCalled()
        expect(ContributionsList.mock.instances[0].init).toHaveBeenCalled()
        expect(DonationInput.mock.instances[0].init).toHaveBeenCalled()
        expect(LanguagePicker.mock.instances[0].init).toHaveBeenCalled()
        expect(RecipientList.mock.instances[0].init).toHaveBeenCalled()
        expect(Timer.mock.instances[0].init).toHaveBeenCalled()

        translationService.emit("update")

        expect(DonationInput.mock.instances[0].refresh).toHaveBeenCalled()
    })
})