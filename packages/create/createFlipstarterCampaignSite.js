import CID from 'cids'
import { uploadFile } from '../utils/ipfs/ipfs'
import { dag as clientDagNode } from 'dag-loader!@ipfs-flipstarter/client/client-dag.config.js'

export default async function createFlipstarterCampaignSite(ipfs, indexPageHtml, initialCampaign) {
  const [indexPageLink, campaignLink] = await Promise.all([
    await uploadFile(ipfs, "index.html", indexPageHtml),
    uploadFile(ipfs, "campaign.json", JSON.stringify(initialCampaign))
  ])

  return await uploadSite(ipfs, indexPageLink, campaignLink)
}

async function uploadSite(ipfs, indexLink, campaignLink) {

  clientDagNode.rmLink("campaign.json") //If campaign.json is included in hash due to testing.
  clientDagNode.addLink(campaignLink)
  clientDagNode.rmLink("index.html")
  clientDagNode.addLink(indexLink)

  const info = await ipfs.dag.put(clientDagNode, { format: 'dag-pb', hashAlg: 'sha2-256' })
  const cid = new CID(info.multihash).toBaseEncodedString()
  await ipfs.dag.get(cid)
  await ipfs.dag.get(campaignLink.Hash)
  return cid
}