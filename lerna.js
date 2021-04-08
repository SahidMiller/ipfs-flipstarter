const { loadPackages, iter, exec, changes, filters } = require('lerna-script')
const path = require('path');
const CID = require('cids');
const chokidar = require('chokidar');
const fs = require('fs');

const BUILT_FLAG = "deployed-on-ipfs"

async function clean(log) {
    const packages = await loadPackages();
    packages.forEach(package => {
        changes.unbuild(package, { log })(BUILT_FLAG + ":development")
        changes.unbuild(package, { log })(BUILT_FLAG + ":production")
    })
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
  await iter.batched(packages)(async (package, log) => {
    const packageJson = require(package.manifestLocation)
    const dependentEnvVars = getDependentEnv(packages, package, cids)

    // Pass env variables of dependencies to the dependent package, God willing.
    let envVarsStr = Object.values(dependentEnvVars).reduce((vars, { envVar, cid }) => {
        
        return vars += `${envVar}=${cid} `

    //Trim, yarn has issues
    }, 'npx cross-env ').trim()

    //Run build on all the packages not deployed on ipfs yet, God willing.
    if (package.scripts.build && !changes.isBuilt(package)(BUILT_FLAG + ":" + mode)) {
        
        if (mode === "development") {
            envVarsStr += " NODE_ENV=development"
        }

        const command = `${envVarsStr} npm run build`
        
        if (verbose) {
            log.info("deploy-on-ipfs", package.name, "Running", command)
        }

        console.log(await exec.command(package, { silent: false, log })(command))

        //Mark as deployed on ipfs, God willing.
        changes.build(package, { log })(BUILT_FLAG + ":" + mode)

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
  
  //Return env variables for development pipeline, God willing.
  return cids
}

async function watch(log) {
    log.info("deploy-on-ipfs-watcher", "Starting IPFS package watcher");
    log.disableProgress()

    const packages = await loadPackages()
    const paths = packages.map(package => package.location)

    //Deploy and then start all packages
    const envVars = await deploy(log, { verbose: false, mode: "development" })
    await Promise.all(packages.map(async (package) => {
        const dependentEnvVars = getDependentEnv(packages, package, envVars)
        log.info("deploy-on-ipfs-watcher", `Starting ${package.name} with:`, dependentEnvVars)
        await start(package, dependentEnvVars)
    }))

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
        
        log.info("Rebuilding", package.name);
        
        changes.unbuild(package, { log })(BUILT_FLAG + ":development")
        const nextEnvVars = (await deploy(log, { verbose: false, mode: "development" })) || ""
        
        await start(package, getDependentEnv(packages, package, nextEnvVars))

        log.info("Finished", package.name);
    }
    
    // Add event listeners
    return watcher
        .on("add", path => rebuildPackage(path))
        .on("change", path => rebuildPackage(path))
        .on("unlink", path => rebuildPackage(path));
};

const running = {}
const childProcess = require("@lerna/child-process");
async function start(package, envVars) {
    
    if (package.scripts.start) {

        if (running[package.name]) {
            running[package.name].kill("SIGINT", { forceKillAfterTimeout: 2000 })
        }

        // Pass env variables of dependencies to the dependent package, God willing.
        let envVarsStr = Object.values(envVars).reduce((vars, { envVar, cid }) => {
            
            return vars += `${envVar}=${cid} `

        //Trim, yarn has issues
        }, 'npx cross-env ').trim()

        running[package.name] = await childProcess.spawn(envVarsStr + " npm run start", [], {
            cwd: package.location,
            shell: true,
            env: Object.assign({}, envVars, {
              LERNA_PACKAGE_NAME: package.name,
              LERNA_ROOT_PATH: __dirname,
            }),
            pkg: package
        })
    }
}

function getDependentEnv(packages, package, envVars) {
    const dependencies = filters.includeFilteredDeps(packages)([package])

    // Pass env variables of dependencies to the dependent package, God willing.
    return dependencies.reduce((vars, package) => {
        const { envVar, cid } = envVars[package.name] || {}
        if(!!envVar && !!cid) {
            vars[envVar] = cid
        }

        return vars
    }, {})
}

module.exports["deploy-on-ipfs"] = deploy;
module.exports["deploy-on-ipfs-watcher"] = watch;
module.exports["deploy-on-ipfs-cleaner"] = clean;