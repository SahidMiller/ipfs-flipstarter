const { loadPackages, iter, exec, changes, filters } = require('lerna-script')
const path = require('path');
const CID = require('cids');
const chokidar = require('chokidar');
const fs = require('fs');

const BUILT_FLAG = "deployed-on-ipfs"

async function clean(log) {
    const packages = await loadPackages();
    packages.forEach(package => changes.unbuild(package, { log })(BUILT_FLAG))
    iter.parallel(packages, { log })((package) => exec.script(package, { log })("clean"))
}

/**
 * Deploy all packages with "ipfs" property in package.json and "build" script.
 * 
 * ipfs property as string is root folder in package to add recursively
 * ipfs property as object with { root, envVar } 
 * 
 * root property is required
 * envVar property is optional, allowing to compose builds and embed latest CID, God willing
 * 
 * ipfs add -r {root}
 * 
 * @param {logger} log lerna-script logger for composability
 * @returns None
 */
async function deploy(log, { verbose = true, mode = "production" } = {}) {

  if (verbose) {
    log.info("deploy-on-ipfs", "Building IPFS packages");
  }
  
  log.disableProgress()

  const packages = await loadPackages();

  const cids = {}
  return iter.batched(packages)(async (package, log) => {
    const packageJson = require(package.manifestLocation)
    const dependencies = filters.includeFilteredDeps(packages)([package])

    //Run build on all the packages not deployed on ipfs yet, God willing.
    if (package.scripts.build && !changes.isBuilt(package)(BUILT_FLAG)) {
        
        // Pass env variables of dependencies to the dependent package, God willing.
        let envVars = dependencies.reduce((vars, package) => {
            const { envVar, cid } = cids[package.name] || {}
            const envVarStr = !!envVar && !!cid ? `${envVar}=${cid} ` : ""
            return vars += envVarStr
        
        //Trim, yarn has issues
        }, 'npx cross-env ').trim()

        if (mode === "development") {
            envVars += " NODE_ENV=development"
        }

        const command = `${envVars.trim()} npm run build`
        
        if (verbose) {
            log.info("deploy-on-ipfs", package.name, "Running", command)
        }

        console.log(await exec.command(package, { silent: false, log })(command))

        //Mark as deployed on ipfs, God willing.
        changes.build(package, { log })(BUILT_FLAG)

    } else {

        log.warn("deploy-to-ipfs", package.name, "Skipping build")
    }

    // Process only packages with 'ipfs' object or string in package.json
    if (packageJson.ipfs) {

        const root = typeof(packageJson.ipfs) === 'object' ? packageJson.ipfs.root : packageJson.ipfs

        const selectedRoot = path.normalize(path.join(package.location, root))

        //Avoid adding anything outside this package
        if (selectedRoot.indexOf(package.location) === -1) {
            log.warn("deploy-on-ipfs", package.name, "IPFS root outside of package root! Aborting.", root)
            return
        }

        if (!fs.existsSync(selectedRoot)) {
            log.error("deploy-on-ipfs", package.name, "IPFS root does not exist! Aborting.", root)
            return
        }

        //Add all items from selected root folder
        const response = await exec.command(package)("ipfs add -rQ " + selectedRoot)

        //Check if a valid CID from stdout
        let cid

        try {
            cid = new CID(response).toBaseEncodedString()
        } catch (err) {
            log.warn("deploy-on-ipfs", package.name, "Failed CID check", response)
            return
        }

        //Set env var if 
        const envVar = packageJson.ipfs.envVar
        if (typeof(envVar) === 'string') {
            log.info("deploy-to-ipfs", package.name, envVar, cid)
            cids[package.name] = { envVar, cid }
        } else {
            log.info("deploy-to-ipfs", package.name, cid)
        }
    }
  });
}

async function watch(log) {
    log.info("deploy-on-ipfs-watcher", "Starting IPFS package watcher");
    log.disableProgress()

    const packages = await loadPackages()
    const paths = packages.map(package => package.location)

    await deploy(log, { verbose: false, mode: "development" })

    packages.map(package => log.info("deploy-on-ipfs-watcher", `Watching ${package.name}`))

    // Initialize the watcher
    let watcher = chokidar.watch(paths, {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /node_modules/, // ignore node_modules
          /lib|dist/, // ignore build output files
          /\*___jb_tmp___/ // ignore jetbrains IDE temp files
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: true // Helps minimising thrashing of watch events
    });
    
    const rebuildPackage = async (path) => {
        const package = packages.find(package => path.indexOf(package.location) === 0)
        changes.unbuild(package, { log })(BUILT_FLAG)
        log.info("Rebuilding", package.name);
        await deploy(log, { verbose: false, mode: "development" })
        log.info("Finished", package.name);
    }
    
    // Add event listeners
    return watcher
        .on("add", path => rebuildPackage(path))
        .on("change", path => rebuildPackage(path))
        .on("unlink", path => rebuildPackage(path));
};

module.exports["deploy-on-ipfs"] = deploy;
module.exports["deploy-on-ipfs-watcher"] = watch;
module.exports["deploy-on-ipfs-cleaner"] = clean;
