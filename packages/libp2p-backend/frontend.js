/* eslint-disable */

import moment from 'moment'
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css'
import Ipfs from 'ipfs'
import createIpfs from './network/ipfs'
import createElectrum from './network/electrum'
import FlipstarterServer from 'libp2p-flipstarter-server'

const SATS_PER_BCH = 100000000;

export default async function initialize() {
  const tenMinutes = 10 * 60 * 1000
  const ipfs = await createIpfs()
  const electrum = await createElectrum()
  const server = new FlipstarterServer(ipfs, electrum, {
    useRelayBootstrappers: true,
    updateBootstrappersInterval: tenMinutes,
    republishCampaignsInterval: tenMinutes,
    preloadNodes: __PRELOAD_NODES__
  })
  const ipfsId = (await ipfs.id()).id
  
  let multiaddress

  server.on('campaign-updated', addOrUpdateCampaign.bind(this))
  server.on('campaign-created', addOrUpdateCampaign.bind(this))
  server.on('relays-updated', (relays) => {
    if (relays.length) {
      multiaddress = relays[0] + "/p2p-circuit/p2p/" + ipfsId
    } else {
      multiaddress = undefined
    }
  })

  const { campaigns, relays } = await server.start()

  if (!campaigns.length) {
    $("#no-campaigns-message").removeClass("d-none")
  }

  if (!multiaddress && relays.length) {
    multiaddress = relays[0] + "/p2p-circuit/p2p/" + ipfsId
  }

  $("#campaigns").on("click", "#add", function() {
    //TODO God willing: use dag-loader or cid-loader
    let url = "https://ipfs.io/ipfs/"

    if (multiaddress) {
      url = url + "?type=ipfs&address=" + multiaddress
    }

    window.open(url, "flipstarter-create")
  })
  
  $(".load-indicator").addClass("d-none")
  $("#content-container").removeClass("d-none")

  return false
}

function addOrUpdateCampaign(campaign) {
  const isExpired = moment().unix() >= campaign.expires
  const isActive = !campaign.fullfilled && !isExpired && moment().unix() > campaign.starts
  
  const commitments = getUnrevokedCommitments(campaign)
  const committedSatoshis = getCommittedSatoshis(commitments)
  const requestedSatoshis = getRequestedSatoshis(campaign)

  const campaignView = {
    title: campaign.title,
    id: campaign.id,
    image: campaign.recipients[0].image,
    category: "Flipstarters",
    //description: campaign.descriptions.en.abstract,
    committedBch: committedSatoshis / SATS_PER_BCH,
    requestedBch: requestedSatoshis / SATS_PER_BCH,
    percentageCompleted: (100 * (committedSatoshis / requestedSatoshis)).toFixed(2),
    pledgeStr: commitments.length === 1 ? "1 pledge" : commitments.length + " pledges",
    daysLeftStr: isActive ? moment.unix(campaign.expires).fromNow(true) + " left" : "Ended",
  }

  const campaignCardElem = $(`.cards[data-id^="${campaignView.id}"]`)
  const updatedCampaignCard = buildCampaignCard(campaignView)
  const nextSection = isActive ? $("#ongoing-campaign-container") : $("#completed-campaign-container")
  const nextParent = nextSection.find('.card-container')

  if (campaignCardElem.length) {    
    
    const currentParent = campaignCardElem.closest(".card-container")
    const currentSection = currentParent.closest(".container")
    
    if(currentParent.is(nextParent)) {
      campaignCardElem.replaceWith(updatedCampaignCard)
      return
    } else {
      campaignCardElem.remove()
      if(!currentParent.find('.cards').length) {
        currentSection.addClass('d-none')
      }
    }
  }

  nextParent.append(updatedCampaignCard)
  nextSection.removeClass('d-none')
}

function buildCampaignCard(campaign) {

  return `<div class="col col-12 col-md-6 col-lg-4 mb-4 cards" data-id="${campaign.id}">
      <div class="expand-on-hover">
          <div class="col">
              <div class="card card-border-top" data-id="${campaign.id}">
                  <div class="view" data-test="view">
                      <div class="Ripple-parent">
                        <img src="${campaign.image}" class="card-image-border img-fluid">
                        <div class="mask rgba-white-slight"></div>
                        <div class="Ripple"></div>
                        <p class="card-project-category d-inline-block mx-3">${campaign.category}</p>
                      </div>
                  </div>
                  <div class="card-body">
                      <h4 class="card-title">${campaign.title}</h4>
                      <p class="card-text"></p>
                      <div class="card-footer">
                          <div class="my-2">
                              <div class="progress card-progress-bar">
                                  <div class="progress-bar bg-info" role="progressbar" aria-valuenow="103" aria-valuemin="0" aria-valuemax="100" style="width: ${campaign.percentageCompleted}%;"></div>
                              </div><small>${campaign.committedBch} of ${campaign.requestedBch} BCH (${campaign.percentageCompleted}% completed)</small>
                          </div>
                          <div class="donations text-center mx-3">
                              <div class="card-funding d-inline-block border-right text-left">
                                  <p class="text-uppercase mb-0">${campaign.pledgeStr}</p>
                              </div>
                              <div class="card-goal d-inline-block text-right">
                                <p class="mb-0 text-uppercase">${campaign.daysLeftStr}</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>`
}

function isCommitmentRevoked(campaign, commitment) {
  return commitment.revoked && (!campaign.fullfilled || commitment.revokeTimestamp < campaign.fullfillmentTimestamp)
}

function getCommittedSatoshis(commitments) {
  return commitments.reduce((sum, commitment) => {
    return sum + commitment.satoshis
  }, 0)
}

function getRequestedSatoshis(campaign) {
  return campaign.recipients.reduce((sum, recipient) => {
    return sum + recipient.satoshis
  }, 0)
}

function getUnrevokedCommitments(campaign) {
  
  return (campaign.contributions || []).reduce((commitments, contribution) => {

    commitments = commitments.concat(contribution.commitments.filter(commitment => !isCommitmentRevoked(campaign, commitment)))
    return commitments

  }, []);
}