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

    } catch(err) {
      
      const pendingDials = ipfs.libp2p.dialer._pendingDials
      pendingDials.keys().forEach(key => {
        pendingDials.get(key).destroy()
      })
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
      return await requestStream(connectionStream, { campaignId: this.campaign.publishingId, contribution })
    
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
  
	    const self = this
      
      try {

        connectToCampaigner(this.ipfs, this.campaign)

      } catch(err) {

        console.log("failed to connect to campaigner")
      }

      const update = async (cid) => {
        const contributionsJson = await cat(ipfs, cid + "/contributions.json")
        const fullfillmentJson = await cat(ipfs, cid + "/fullfillment.json")
        
        const contributions = JSON.parse(new TextDecoder().decode(contributionsJson))
        const { fullfilled, fullfillmentTx, fullfillmentTimestamp } = JSON.parse(new TextDecoder().decode(fullfillmentJson))
  
        campaign.contributions = contributions.reduce((commitments, contribution) => 
          commitments.concat(contribution.commitments
            .filter(commitment => !isCommitmentRevoked(campaign, commitment))
            .map(commitment => ({ ...commitment, alias: contribution.alias, comment: contribution.comment }))), [])
  
        campaign.commitmentCount = campaign.contributions.length
        campaign.committedSatoshis = getCommittedSatoshis(campaign.contributions)
  
        campaign.fullfilled = fullfilled
        campaign.fullfillmentTx = fullfillmentTx
        campaign.fullfillmentTimestamp = fullfillmentTimestamp
  
        self.emit('update', campaign)
      }

	    startIpnsListener(ipfs, campaign.publishingId, update)

      try {
      
        startRemoteListeners(campaign.publishingId)
      
      } catch(err) {

        //No problem since the remote side can listen, as long as these are bootstrapped nodes.
        console.log("failed to start remote listeners")
      }
      
      try {

        await update(await resolveIPNSKey(IpfsHttpClient("https://ipfs.io/"), campaign.publishingId))

      } catch(err) {

        console.log("failed to fetch ipns")
      }
    }
  }
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
