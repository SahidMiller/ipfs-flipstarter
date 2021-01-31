# ipfs-flipstarter

ipfs-flipstarter is a suite of packages for developing and deploying ipfs based flipstarter interfaces.

|Package|Description|Current Hash|
|:--:|:----------:|:----|
|**`server`**| IPFS site to host a browser based server that can accept and validate donations in the browser using libp2p-flipstarter-server | QmZHwDiAEdQfzzHdjxiU2R1kDXNVLgzYMUy6e8tt3Qo7YY |
|**`create`**| IPFS site to create flipstarter sites in the browser using IPFS. Includes an adapter to use third-party apis for handling contributions (like the included browser server) | Qmd5BnfEMzkCLefTWKQVru7ECUS1LwvpqBVD6tTPg2JFLm |
|**`client`**| Flipstarter client-side app used and deployed by the create package | QmfTeowDAqPD6CuEaiZSxL1Un17HhMWbCTbwrmoTZ4two3 |

## Concepts

These packages enable full featured flipstarter sites using IPFS based pages and Libp2p/IPNS based communication. These are already hosted on IPFS and users can use them now there. God willing, we'll use an IPNS address to share updated hashes. 

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

## Usage

```
npx webpack --env.ipfs="https://localhost:5001" --env.multiaddrs="/ip4/10.0.0.19/tcp/4001/p2p/12D3K..."
```

Or pass a config
```
npx webpack --env.config="./server-config.json"
```

#### Example config file

```
{
	"ipfs": "http://localhost:5001",
	"multiaddrs": "/ip4/10.0.0.19/tcp/4001/p2p/12D3K",
}
```
