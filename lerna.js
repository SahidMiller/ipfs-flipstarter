const { loadPackages, iter, exec, changes, filters } = require('lerna-script')
const path = require('path');
const CID = require('cids');
const chokidar = require('chokidar');
const fs = require('fs');
const execa = require('execa');

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
    const dependentEnvVars = getDependentEnv(packages, package, cids, mode)

    // Pass env variables of dependencies to the dependent package, God willing.
    let envVarsStr = Object.keys(dependentEnvVars).reduce((vars, name) => {
        const value = dependentEnvVars[name]
        return vars += `${name}=${value} `

    //Trim, yarn has issues
    }, 'npx cross-env ').trim()

    //Run build on all the packages not deployed on ipfs yet, God willing.
    if (package.scripts.build && !changes.isBuilt(package)(BUILT_FLAG + ":" + mode)) {
        
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
        const dependentEnvVars = getDependentEnv(packages, package, envVars, "development")
        log.info("deploy-on-ipfs-watcher", `Starting ${package.name} with:`, dependentEnvVars)
        start(package, dependentEnvVars).catch((err) => {
            log.error(package.name, err)
        })
    }))

    packages.map(package => log.info("deploy-on-ipfs-watcher", `Watching ${package.name}`))

    // Initialize the watcher
    let watcher = chokidar.watch(paths, {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /node_modules/, // ignore node_modules
          /lib|dist/, // ignore build output files
          /\*___jb_tmp___/, // ignore jetbrains IDE temp files
          /(.db|.db-journal)$/, //ignore embedded sql db
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: true // Helps minimising thrashing of watch events
    });
    
    const rebuildPackage = async (path) => {
        const package = packages.find(package => path.indexOf(package.location) === 0)
        
        log.info("Rebuilding", package.name);
        
        // Un mark as built so it is rebuilt in deploy
        changes.unbuild(package, { log })(BUILT_FLAG + ":development")
        
        // Stop the service in case it will be updated (can't do much about children)
        await end(package.name)

        const nextEnvVars = (await deploy(log, { verbose: false, mode: "development" })) || ""
        
        start(package, getDependentEnv(packages, package, nextEnvVars, "development")).catch((err) => {
            log.error(package.name, err)
        })

        log.info("Finished", package.name);
    }
    
    // Add event listeners
    return watcher
        .on("add", path => rebuildPackage(path))
        .on("change", path => rebuildPackage(path))
        .on("unlink", path => rebuildPackage(path));
};

const running = {}
const terminate = require("terminate")
async function start(package, envVars) {
    
    if (package.scripts.start) {

        // Pass env variables of dependencies to the dependent package, God willing.
        const envVarsStr = Object.keys(envVars).reduce((vars, name) => {
            const value = envVars[name]
            return vars += `${name}=${value} `

        //Trim, yarn has issues
        }, 'npx cross-env ').trim()

        //Spawn returns promise since wrapping catch.
        running[package.name] = spawnProcess(envVarsStr + " npm run start", [], {
            cwd: package.location,
            shell: true,
            env: Object.assign({}, envVars, {
              LERNA_PACKAGE_NAME: package.name,
              LERNA_ROOT_PATH: __dirname,
            }),
            pkg: package,
            stdio: "inherit"
        })
    }
}

async function end(packageName) {
    const runningProcess = running[packageName]

    if (runningProcess) {
        
        console.log(packageName, "Shutting down")
        await new Promise((res) => terminate(runningProcess.pid, "SIGINT", { timeout: 1000 }, res))
        console.log(packageName, "Shutdown")

    } else {
        console.log(packageName, "Not running")
    }
}

function getDependentEnv(packages, package, envVars, mode = "production") {
    const dependencies = filters.includeFilteredDeps(packages)([package])

    // Pass env variables of dependencies to the dependent package, God willing.
    return dependencies.reduce((vars, package) => {
        const { envVar, cid } = envVars[package.name] || {}
        if(!!envVar && !!cid) {
            vars[envVar] = cid
        }

        return vars
    }, { "NODE_ENV": mode })
}

module.exports["deploy-on-ipfs"] = deploy;
module.exports["deploy-on-ipfs-watcher"] = watch;
module.exports["deploy-on-ipfs-cleaner"] = clean;

const children = new Set();

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import("execa").Options} opts
 */
 function spawnProcess(command, args, opts) {
    const child = execa(command, args, opts);
    const drain = (exitCode, signal) => {
      children.delete(child);
  
      // don't run repeatedly if this is the error event
      if (signal === undefined) {
        child.removeListener("exit", drain);
      }
  
      // propagate exit code, if any
      if (exitCode) {
        process.exitCode = exitCode;
      }
    };
  
    child.once("exit", drain);
    child.once("error", drain);
  
    if (opts.pkg) {
      child.pkg = opts.pkg;
    }
  
    children.add(child);
  
    return child;
  }