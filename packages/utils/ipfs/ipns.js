import ipns from 'ipns'
import IpfsHttpClient from 'ipfs-http-client'
import last from 'it-last'
import multihash from 'multihashes'
import uint8ArrayToString from 'uint8arrays/to-string'
import pRetry from 'p-retry'
import CID from 'cids'

const preloadNodes = [
  "//node0.preload.ipfs.io", 
  "//node1.preload.ipfs.io", 
  "//node2.preload.ipfs.io", 
  "//node3.preload.ipfs.io"
]

export const unmarshalIpnsMessage = (message) => {
	return ipns.unmarshal(message.data)
}

export function getSerializedRecordKey(id) {
  const origMh = new CID(id).multihash
  const base58mh = new CID(1, 'libp2p-key', origMh, "base58btc").multihash
  const key = ipns.getIdKeys(base58mh).routingKey.uint8Array()
  const serialized = uint8ArrayToString(key, 'base64url');
  return "/record/" + serialized;
}

export async function resolveIPNSKey(ipfs, key) {
  return await last(ipfs.name.resolve(key, { stream: false }));
}


export async function startRemoteListeners(id) {

  return await Promise.all(preloadNodes.map(endpoint => {
      
      try {
        
        resolveIPNSKey(IpfsHttpClient(endpoint), id)

      } catch (err) {}

      return new Promise((resolve) => setTimeout(resolve, 1000))
    }))
}

export async function updateIPNS(ipfs, key, cid) {

  try {
    
    const keys = await ipfs.key.list()
    const { id } = keys.find(k => k.name === key)

    startRemoteListeners(id)

    await pRetry((attemptNumber) => {

    	return new Promise(async (resolve, reject) => {

	      const recordKey = getSerializedRecordKey(id);
	      const peers = await ipfs.pubsub.peers(recordKey)
	      
	      if (peers.length && peers.length >= (preloadNodes.length - attemptNumber)) {
	        
	        resolve(peers)
	      
	      } else {

	        const error = new Error("no peers")
	        reject(error)
	      }
    	})

    }, { 
  		minTimeout: 5000, 
  		retry: 10 
  	})
    
    const result = await ipfs.name.publish(cid, { key, resolve: false })
    
    await ipfs.dag.get(cid)

    return result
  
  } catch (err) {

    debugger
  }
}