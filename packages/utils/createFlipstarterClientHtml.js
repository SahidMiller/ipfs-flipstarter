const moment = require('moment')
const mustache = require('mustache')

const markdownParser = require('./markdownParser')
const { SATS_PER_BCH } = require('./bitcoinCashUtilities')

module.exports = async function createFlipstarterClientHtml(template, campaign) {

    const today_date = moment().unix()
  
    let timerLabel, timerDaysUntil
    
    if (today_date < campaign.starts) {
  
      timerLabel = "Starts"
      timerDaysUntil = moment().to(moment.unix(campaign.starts))
  
    } else {
      
      timerLabel = today_date < campaign.expires ? "Expires" : "Expired"
      timerDaysUntil = moment().to(moment.unix(campaign.expires))
    }
  
    const requestedAmount = campaign.recipients.reduce((sum, recipient) => sum + recipient.satoshis, 0)
    return mustache.render(template, {
      title: campaign.title,
      description: await markdownParser(campaign.descriptions.en.abstract),
      details: await markdownParser(campaign.descriptions.en.proposal),
      url: campaign.recipients[0].url,
      image: campaign.recipients[0].image,
      recipients: campaign.recipients.map(recipient => {
        return {
          ...recipient,
          amountInSatoshis: recipient.satoshis,
          amountInBch: (recipient.satoshis / SATS_PER_BCH).toLocaleString()
        }
      }),
      requestedAmount,
      recipientCount: campaign.recipients.length,
      timerLabel,
      timerDaysUntil,
      contributorsLabel: "contributors",
      recipientsLabel: "recipients"
    })
  }