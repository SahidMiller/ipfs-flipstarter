import CID from 'cids'
import { cat, uploadFile } from '../utils/ipfs/ipfs'
import mustache from 'mustache'
// https://stackoverflow.com/questions/44029866/import-javascript-files-as-a-string
import clientIndexPageTempl from '!raw-loader!./node_modules/@ipfs-flipstarter/client/dist/static/templates/index.html'
import clientDagNode from 'dag-loader!./node_modules/@ipfs-flipstarter/client/client-dag.config.js'

export default async function createFlipstarterCampaignSite(ipfs, initialCampaign) {
  const [indexPageLink, campaignLink] = await Promise.all([
    uploadIndexPage(ipfs, initialCampaign),
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

async function uploadIndexPage(ipfs, campaign) {

  const renderedIndexPage = mustache.render(clientIndexPageTempl, { 
    title: campaign.title,
    description: campaign.descriptions.en.abstract,
    url: campaign.recipients[0].url,
    image: campaign.recipients[0].image
  })

  return await uploadFile(ipfs, "index.html", renderedIndexPage)
}