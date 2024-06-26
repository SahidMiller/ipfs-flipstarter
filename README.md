# ipfs-flipstarter

![banner](https://gateway.ipfs.io/ipfs/QmQCBJHFzz1BFwToNq2ps72F88q8XGVGdSzkVPw3u3NzGW)


[![](https://ipfs.io/ipns/k51qzi5uqu5dgdocf63983yb9eigz3nqsu892vph2dq9hsxm5bhj8c45o5ggdb/build.svg)](https://github.com/SahidMiller/ipfs-flipstarter/actions)
[![](https://ipfs.io/ipns/k51qzi5uqu5dgdocf63983yb9eigz3nqsu892vph2dq9hsxm5bhj8c45o5ggdb/coverage.svg)](https://github.com/SahidMiller/ipfs-flipstarter/actions)

**ipfs-flipstarter is a suite of packages for developing and deploying ipfs based flipstarter interfaces.**

|Package|Description|
|:--:|:----------:|
|**`server`**| IPFS site to host a browser based server that can accept and validate donations in the browser using libp2p-flipstarter-server |
|**`create`**| IPFS site to create flipstarter sites in the browser using IPFS. Includes an adapter to use third-party apis for handling contributions (like the included browser server) |
|**`client`**| Flipstarter client-side app used and deployed by the create package |

| Create page | Client page example |
|-------|---------|
| ![Screenshot of the Create page](https://gateway.ipfs.io/ipfs/QmRNKsFqX6YtKopfY7JGNTpovZyS7dKjaDhgaALXpfyB6Z) | ![Screenshot of the client screen](https://gateway.ipfs.io/ipfs/QmPGTpMzeu9UVx8ftRvukStdgu9DtA5iUGND4MvoWojkQt) |

## Concepts

These packages enable full featured flipstarter sites using IPFS based pages and Libp2p/IPNS based communication. These are already hosted on IPFS and users can use them now there. We'll use an IPNS address to share updated hashes. 

This source is intended to be used by developers which will result in new hashes which can be shared.

These packages are deployed to IPFS during the build process and will need a remote ipfs node connection to do so. Developers cannot build these as conventional websites since these are tailored to create new IPFS sites on the client side (ex. create page app) and so we use the latest package build's hash to do this. The flow is like this:

client page app build + hashed -> passed to create page app build + hashed -> passed to server app build + hashed.

Hardcoding dependent CIDs and skipping certain packages during build is not yet supported.

## Installation

```
git clone https://github.com/SahidMiller/ipfs-flipstarter
cd ipfs-flipstarter 
npm i
```

## Build

```
npx webpack --env="ipfsApi=https://localhost:5001"
```

#### Build command line options

`npx webpack --env="<boolean option>" --env="<option>=<value>"`

The following command line options are available:

|Name|Required|Type|Default|Description|
|:--:|:-----:|:--:|:-----:|:----------|
|**`ipfs`**|no|`{string}`|`http://localhost:5001`| API URL for go-ipfs node. |
|**`development`**|no|`{boolean}`|`false`| Development mode boolean flag. Serves on port 55554 |
|**`noIpfs`**|no|`{boolean}`|`false`| Skip IPFS build |
|**`verbose`**|no|`{boolean}`|`false`| Verbose logging for debugging purposes |

#### Advanced build command options

|Name|Required|Type|Default|Description|
|:--:|:-----:|:--:|:-----:|:----------|
|**`clientAppCid`**|no|`{string}`|`false`| Skip IPFS for client app and provide this cid to create app |
|**`createAppCid`**|no|`{string}`|`false`| Skip IPFS for create app and provide this cid to server app |
|**`campaignFilePath`**|no|`{string}`|`undefined`| Provide default campaign file to copy to client app (only on development). If indexFile also provided, serves client app |
|**`indexFilePath`**|yes|`{string}`|`undefined`| Provide default campaign file to copy to client app (only on development). If campaignFile also provided, serves client app  |
