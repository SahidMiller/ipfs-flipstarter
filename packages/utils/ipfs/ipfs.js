import { collect } from 'streaming-iterables'
import { toDagNodeFile, toDagNodeDirectory } from './dag'
import CID from 'cids'

export async function cat(ipfs, path) {
	const [data] = (await collect(ipfs.cat(path)))
	return data
}

export async function genKey(ipfs, keyName) {
	const keys = await ipfs.key.list()
	const foundKey = keys.find(key => key.name === keyName)
	return foundKey || await ipfs.key.gen(keyName)
}

export async function uploadFile(ipfs, name, data) {
	const encoded = new TextEncoder().encode(data)
	const file = toDagNodeFile(encoded)
	const info = await ipfs.dag.put(file, { format: 'dag-pb', hashAlg: 'sha2-256' })
	const hash = new CID(info.multihash).toBaseEncodedString()
	return { Hash: hash, Tsize: file.size, Name: name }
}

export async function uploadDirectory(ipfs, name, links) {
	const directory = toDagNodeDirectory(links)
	const info = await ipfs.dag.put(directory, { format: 'dag-pb', hashAlg: 'sha2-256' })
	const hash = new CID(info.multihash).toBaseEncodedString()
	return { Hash: hash, Tsize: directory.size, Name: name }
}