import CID from 'cids'
import { cat, uploadFile } from '../utils/ipfs/ipfs'
import mustache from 'mustache'

export default async function createFlipstarterCampaignSite(ipfs, initialCampaign) {
  const [indexPageLink, campaignLink] = await Promise.all([
    uploadIndexPage(ipfs, initialCampaign),
    uploadFile(ipfs, "campaign.json", JSON.stringify(initialCampaign))
  ])

  return await uploadSite(ipfs, indexPageLink, campaignLink)
}

async function uploadSite(ipfs, indexLink, campaignLink) {

  const rootDAG = (await ipfs.dag.get(__FLIPSTARTER_CLIENT_SITE_CID__)).value

  rootDAG.rmLink("campaign.json") //If campaign.json is included in hash due to testing
  rootDAG.addLink(campaignLink)
  rootDAG.rmLink("index.html")
  rootDAG.addLink(indexLink)

  const info = await ipfs.dag.put(rootDAG, { format: 'dag-pb', hashAlg: 'sha2-256' })
  const cid = new CID(info.multihash).toBaseEncodedString()
  await ipfs.dag.get(cid)
  await ipfs.dag.get(campaignLink.Hash)
  return cid
}

async function uploadIndexPage(ipfs, campaign) {

  const indexTemplate = await (await fetch('static/templates/index.html')).text()

  const renderedIndexPage = mustache.render(indexTemplate, { 
    title: campaign.title,
    description: campaign.descriptions.en.abstract,
    url: campaign.recipients[0].url,
    image: campaign.recipients[0].image
  })

  return await uploadFile(ipfs, "index.html", renderedIndexPage)
}