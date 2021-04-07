import importer from 'ipfs-unixfs-importer'
import IPLD from 'ipld'
import inMemory from 'ipld-in-memory'
import { DAGNode } from 'ipld-dag-pb'
import UnixFS from 'ipfs-unixfs'
import multicodec from 'multicodec'

export const toDagNodeFile = (data) => {
	const file = new UnixFS({ type: 'file', data }).marshal();
	return new DAGNode(file);
}

export const toDagNodeDirectory = (links) => {
	const dir = new UnixFS({ type: 'directory' }).marshal();
	return new DAGNode(dir, links)
}

export const hashData = async (content, options) => {
  options = options || {}
  options.onlyHash = true

  const ipld = await inMemory(IPLD)
  let lastResult

  for await (const result of importer([{ content }], ipld, options)) {
    lastResult = result
  }

  return {
    cid: `${lastResult.cid}`,
    size: lastResult.size
  }
}

export const hashNode = async (node, options) => {
	const ipld = await inMemory(IPLD)
	const { format, cidVersion, hashAlg } = options

	const formatName = format.toUpperCase().replace(/-/g, '_');
	const formatCodec = multicodec[formatName]

	const hashAlgName = hashAlg.toUpperCase().replace(/-/g, '_');
	const hashAlgCodec = multicodec[hashAlgName]
	return ipld.put(node, formatCodec, {
		hashAlg: hashAlgCodec,
		cidVersion: 0,
		onlyHash: true
	})
}