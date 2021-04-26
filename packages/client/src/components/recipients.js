import { SATS_PER_BCH } from "@ipfs-flipstarter/utils/bitcoinCashUtilities"

export default class RecipientList {
    
    constructor({ recipientCount, recipientList }, campaignService) {
        this.recipientCountElem = recipientCount
        this.recipientListElem = recipientList
        this.campaignService = campaignService
    }

    init() {
        //No need for updating recipient list since not associated with fullfillment
        this.updateList(this.campaignService.campaign)
    }

    updateList(campaign) {
        // Add each recipient to the fundraiser.

        //Clear out any existing content
        this.recipientListElem.innerHTML = ""
        this.recipientCountElem.textContent = campaign.recipients.length;

        campaign.recipients.forEach(recipient => {
            const amount = recipient.satoshis / SATS_PER_BCH
            const recipientAmount = Number(amount);

            document.getElementById(
                "recipientList"
            ).innerHTML += `<li class='col s6 m6 l12'>
                        <a href='${recipient.url}' target="_blank">
                            <img src='${recipient.image}' alt='${recipient.name}' />
                            <span>
                                <b>${recipient.name}</b>
                                <i title="${recipient.satoshis}" class="amountInBch" >${recipientAmount} BCH</i>
                            </span>
                        </a>
                    </li>`;
        })
    }
}