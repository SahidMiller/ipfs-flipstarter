import { calculateTotalContributorMinerFees  } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"

import Signup from '@dweb-cash/provider'
const signup = new Signup.cash({});

export default class SignupDonation {
    constructor({ signupButton }, campaignService, donationService) {
      this.signupButton = signupButton
      this.donationService = donationService
      this.campaignService = campaignService
    }

    init() {
        this.signupButton.addEventListener("click", this.donateViaSignUp.bind(this));
    }

    async donateViaSignUp() {

      try {
        // Get the number of satoshis the user wants to donate.
        const campaign = this.campaignService.getCampaign()
        const { name, comment, satoshis } = this.donationService.getDonation()
  
        // If the user wants to donate some satoshis..
        if (satoshis) {
  
          let recipients = []
  
          // For each recipient..
          for (const recipientIndex in campaign.recipients) {
            const outputValue = campaign.recipients[recipientIndex].satoshis;
            const outputAddress = campaign.recipients[recipientIndex].address;
  
            // Add the recipients outputs to the request.
            recipients.push({ value: outputValue, address: outputAddress });
          }
  
          this.donationService.ready("signup")
          
          const { payload } = await signup.contribute(Number(satoshis), "SAT", {
            title: campaign.title,
            expires: campaign.expires,
            alias: name,
            comment: comment,
            includingFee: calculateTotalContributorMinerFees(1, this.campaignService.targetFeeRate)
          }, recipients);
  
          this.donationService.commit(null, payload)
        }         
  
      } catch (err) {
  
        if (err && err.status === 'ERROR') {
          console.log(err.message)
        }

        this.donationService.commit(err)
      }
    }
}