import PeerId from 'peer-id'
import { requestStream } from 'libp2p-stream-helper'
import { getSerializedRecordKey, unmarshalIpnsMessage, startRemoteListeners, resolveIPNSKey } from '../utils/ipfs/ipns'
import EventEmitter from 'events'
import { cat } from '../utils/ipfs/ipfs'
import pRetry from 'p-retry'
import pTimeout from 'p-timeout'
import CID from 'cids'
import IpfsHttpClient from 'ipfs-http-client'
import Ipfs from 'ipfs'

const startIpnsListener = (ipfs, base58Id, cb) => {
    let seqNum = 0
    const topic = getSerializedRecordKey(base58Id)
    ipfs.pubsub.subscribe(topic, async (message) => { 
      //debugger;
      const ipnsRecord = unmarshalIpnsMessage(message)
      if (ipnsRecord.sequence > seqNum) {
        seqNum = ipnsRecord.sequence
        cb(ipnsRecord.value.toString().replace('/ipfs/', ''))
      }
    })
}

const connectToCampaigner = async (ipfs, campaign) => {
  return await pRetry(async (attempt) => {
    const address = campaign.addresses[attempt - 1]
    
    try {
      
      await pTimeout(ipfs.swarm.connect(address), 10000)
      return address

    } catch(error) {
      
      const pendingDials = ipfs.libp2p.dialer._pendingDials
      Array.from(pendingDials.keys()).forEach(key => {
        pendingDials.get(key).destroy()
      })

      throw error
    }
  }, { retry: campaign.addresses.length })
}

export class Libp2pServerConnector extends EventEmitter {

  constructor() {
  	super()
  	this.ipfs = null
    this.listening = false
  }

  async contribute(contribution) {
    let address

    try {

      address = await connectToCampaigner(this.ipfs, this.campaign)

    } catch (error) {
      
      return { error: { message: "Unable to connect" } }
    }

    try {
    
      const origMh = new CID(this.campaign.ipfsId).multihash
      const base58mh = new CID(1, 'libp2p-key', origMh, "base58btc").multihash
      const peerId = PeerId.createFromCID(new CID(this.campaign.ipfsId))
      const connectionStream = await this.ipfs.libp2p.dialProtocol(peerId, '/flipstarter/submit')
      const response = await requestStream(connectionStream, { campaignId: this.campaign.publishingId, contribution })
      await this.getCampaignDetails()

      return response

    } catch (error) {
      
      return { error: { message: "Contribution submission failed" } }
    
    } finally {

      if (address) {
        try {
          await this.ipfs.swarm.disconnect(address)
        } catch (error) {
          console.log("failed to disconnect from remote node")
        }
      }
    }
  }

  async getCampaignDetails() {
    const self = this
    const peerId = PeerId.createFromCID(new CID(this.campaign.ipfsId))

    const getCampaignDetails = async () => {
      const connectionStream = await self.ipfs.libp2p.dialProtocol(peerId, '/flipstarter/campaignDetails')
      const campaignDetails = await requestStream(connectionStream, { campaignId: this.campaign.publishingId })
      self.update(campaignDetails)
    }

    let tryAgain = false

    try {

      await getCampaignDetails()

    } catch (err) {
      console.log("failed to fetch updates manually, trying again")
      tryAgain = true
    }

    if (tryAgain) {
      
      try {
      
        await getCampaignDetails()
      
      } catch (err) {
        
        console.log("failed to fetch updates manually")
      }
    }
  }

  async update({ contributions, fullfilled, fullfillmentTx, fullfillmentTimestamp }) {
    const campaign = this.campaign
    const self = this

    campaign.contributions = contributions.reduce((commitments, contribution) => 
      commitments.concat(contribution.commitments
        .filter(commitment => !isCommitmentRevoked(self.campaign, commitment))
        .map(commitment => ({ ...commitment, alias: contribution.alias, comment: contribution.comment }))), [])

    campaign.commitmentCount = campaign.contributions.length
    campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)

    campaign.fullfilled = fullfilled
    campaign.fullfillmentTx = fullfillmentTx
    campaign.fullfillmentTimestamp = fullfillmentTimestamp

    this.emit('update', campaign)
  }

  async listen(campaign) {

  	if (!this.listening) {

	    const ipfs = await Ipfs.create({ 
        EXPERIMENTAL: {
          ipnsPubsub: true
        }
      })
  
      this.ipfs = ipfs
	    this.listening = true
      this.campaign = campaign
        
      try {
        connectToCampaigner(this.ipfs, this.campaign)
      } catch(err) {
        
        console.log("failed to connect to campaigner")
      }

      try {
        
        const self = this
  	    startIpnsListener(ipfs, campaign.publishingId, async (cid) => {
          self.update(await getUpdatedCampaign(self.ipfs, cid))
        })

      } catch (err) {
        
        console.log("failed to start remote listener")
      }

      try {
        this.getCampaignDetails()
      } catch (err) {

        console.log("failed to fetch latest campaign details manually")
      }

      try {
        startRemoteListeners(campaign.publishingId)
      } catch(err) {

        //No problem since the remote side can listen, as long as these are bootstrapped nodes.
        console.log("failed to start remote listeners")
      }
      
      try {
        await self.update(await resolveIPNSKey(IpfsHttpClient("https://ipfs.io/"), campaign.publishingId))
      } catch(err) {

        console.log("failed to fetch ipns")
      }
    }
  }
}

async function getUpdatedCampaign(ipfs, cid) {

  const contributionsJson = await cat(ipfs, cid + "/contributions.json")
  const fullfillmentJson = await cat(ipfs, cid + "/fullfillment.json")
  
  const contributions = JSON.parse(new TextDecoder().decode(contributionsJson))
  const { fullfilled, fullfillmentTx, fullfillmentTimestamp } = JSON.parse(new TextDecoder().decode(fullfillmentJson))

  return { contributions, fullfilled, fullfillmentTx, fullfillmentTimestamp }
}

function isCommitmentRevoked(campaign, commitment) {
  return commitment.revoked && (!campaign.fullfilled || commitment.revokeTimestamp < campaign.fullfillmentTimestamp)
}

function getUnrevokedCommitments(campaign) {
    
    return campaign.contributions.reduce((commitments, contribution) => {

      commitments = commitments.concat(contribution.commitments.filter(commitment => !isCommitmentRevoked(campaign, commitment)))
      return commitments

    }, []);
}

function getCommittedSatoshis(commitments) {
  return commitments.reduce((sum, commitment) => {
    return sum + commitment.satoshis
  }, 0)
}
