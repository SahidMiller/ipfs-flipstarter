import Ipfs from 'ipfs'

export default async () => await Ipfs.create({ 
  repo: "flipstarter-server",
  EXPERIMENTAL: {
    ipnsPubsub: true
  }
})