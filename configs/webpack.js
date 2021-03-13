const webpack = require("webpack")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve')
const WebpackCdnPlugin = require('webpack-cdn-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const { WebpackSeries, WebpackSeriesPlugin } = require('webpack-series')
const IpfsWebpackPlugin = require('ipfs-webpack-plugin')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')
const { merge } = require('webpack-merge')
const fs = require('fs')
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')

const commonConfig = {
  mode: "development",
  watch: false,
  devtool: 'source-map',
  stats: 'errors-only',
  resolve: {
    fallback: {
		tls: false,
		net: false,
		assert: require.resolve("assert"),
		util: require.resolve("util"),
		url: require.resolve("url/"),
		stream: require.resolve("stream-browserify"),
		crypto: require.resolve("crypto-browserify"),
		process: require.resolve("process/browser"),
		http: require.resolve("stream-http"),
		https: require.resolve("https-browserify")
    },
  },
  module: {
    rules: [
      { test: /\.html$/, use: 'html-loader' },
      { 
        test: /\.css$/, 
        use: [{
	      	loader: 'file-loader',
	      	options: {
	      		name: 'static/css/[name].[ext]',
	      	}
        }, {
        	loader: 'extract-loader',
        	options: {
        		publicPath: '../../'
        	}
        }, {
        	loader: 'css-loader'
        }] 
      },
      { 
      	test: /\.(png|jpe?g|gif|woff2|woff|mp3)$/, 
      	loader: 'file-loader',
      	options: {
      		name: 'static/media/[name].[ext]',
      		publicPath: ''
      	}
      },
      {
        test: /\.sql$/i,
        loader: 'raw-loader',
      },
      {
        test: /\.(node)$/i,
        loader: 'node-loader',
        options: {
        	name: 'build/[name].[ext]'
        }
      }
    ]
  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new webpack.ProvidePlugin({
        process: 'process',
        Buffer: ['buffer', 'Buffer'],
  	})
  ],
}

let clientCdnModules = [{
	name: 'ipfs',
	var: 'Ipfs',
	path: 'dist/index.min.js',
	prodUrl: 'https://cdn.jsdelivr.net/npm/:name/:path',
	crossOrigin: 'anonymous',
	sri: true
}]

let createCdnModules = [{
	name: 'ipfs',
	var: 'Ipfs',
	path: 'dist/index.min.js',
	prodUrl: 'https://cdn.jsdelivr.net/npm/:name/:path',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'jquery',
	var: '$',
	prodUrl: 'https://code.jquery.com/jquery-3.5.1.slim.min.js',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'bchaddrjs',
	var: 'bchaddr',
	prodUrl: 'https://unpkg.com/bchaddrjs@0.4.9/dist/bchaddrjs-0.4.9.min.js',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'bootstrap',
	prodUrl: 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/:path',
	crossOrigin: 'anonymous',
	path: 'js/bootstrap.min.js',
	style: "css/bootstrap.min.css",
	sri: true
}, {
	name: 'popper.js',
	var: 'Popper',
	prodUrl: 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js',
	crossOrigin: 'anonymous',
	sri: true
}]

let serverCdnModules = [{
	name: 'ipfs',
	var: 'Ipfs',
	path: 'dist/index.min.js',
	prodUrl: 'https://cdn.jsdelivr.net/npm/:name/:path',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'jquery',
	var: '$',
	prodUrl: 'https://code.jquery.com/jquery-3.5.1.slim.min.js',
	crossOrigin: 'anonymous',
	sri: true
}, {
	name: 'bootstrap',
	prodUrl: 'https://stackpath.bootstrapcdn.com/bootstrap/4.5.0/:path',
	crossOrigin: 'anonymous',
	path: 'js/bootstrap.min.js',
	style: "css/bootstrap.min.css",
	sri: true
}, {
	name: 'popper.js',
	var: 'Popper',
	prodUrl: 'https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js',
	crossOrigin: 'anonymous',
	sri: true
}]

const getClientAppConfig = (env) => {

	return merge(commonConfig, {
		name: "client",
		target: 'web',
		entry: {
			app: './src/client/index.js'
		},
		output: { 
			path: path.join(__dirname, '../dist/client'),
			filename: "static/js/[name].js",
	  		publicPath: './'
		},
		plugins: [
			new RemovePlugin({
				before: {
			        include: [
			            './dist/client'
			        ],
				    log: false,
				    logWarning: true,
				    logError: true,
				    logDebug: false
			    },
			    watch: {
			    	beforeForFirstBuild: true
			    }
			}), 
			new HtmlWebpackPlugin({
				chunks: ["app"],
				template: './public/templates/index.html',
				filename: '../create/static/templates/index.html',
				publicPath: './',
				inject: 'body',
				favicon: "./public/img/logo.ico",
			})
		]
	})
}

const getCreateAppConfig = (env) => {

	const config = {
		name: 'create',
		target: 'web',
		entry: {
			create: './src/create/index.js'
		},
		output: { 
			path: path.join(__dirname, '../dist/create'),
			filename: "static/js/[name].js",
			publicPath: './', //Necessary with WebpackCdn
		},
		plugins: [
			new RemovePlugin({
				before: {
			        include: ['./dist/create'],
				    log: false,
				    logWarning: true,
				    logError: true,
				    logDebug: false
			    },
			    watch: {
			    	beforeForFirstBuild: true
			    }
			}), new HtmlWebpackPlugin({
				template: './views/create.html',
				chunks: ["create"],
				filename: 'index.html',
				publicPath: './',
				inject: 'body',
				favicon: "./public/img/logo.ico",
			})
		]
	}

	return merge(commonConfig, config)
}

const getServerAppConfig = (env = {}) => {
	const config = {
		name: "server",
		target: "web",
		entry: {
			index: "./src/server/index.js"
		},
		output: { 
			path: path.join(__dirname, "../dist/server"),
			filename: "static/js/[name].js",
			publicPath: './'
		},
		plugins: [
			new RemovePlugin({
				before: {
			        include: ['./dist/server'],
				    log: false,
				    logWarning: true,
				    logError: true,
				    logDebug: false
			    },
			    watch: {
			    	beforeForFirstBuild: true
			    }
			}),
			new HtmlWebpackPlugin({
				template: './views/server.html',
				chunks: ["index"],
				filename: 'index.html',
				inject: 'body',
				publicPath: "./",
				favicon: "./public/img/logo.ico",
			}),
			new webpack.DefinePlugin({
				__ELECTRUM_SERVERS__: JSON.stringify([
					{ "address": "testnet.bitcoincash.network", "port": 60004, "scheme": "wss" },
					{ "address": "blackie.c3-soft.com", "port": 60004, "scheme": "wss" },
					{ "address": "electroncash.de", "port": 60004, "scheme": "wss" }
				]),
				__PRELOAD_NODES__: JSON.stringify([
					"https://node0.preload.ipfs.io", 
					"https://node1.preload.ipfs.io", 
					"https://node2.preload.ipfs.io", 
					"https://node3.preload.ipfs.io"
				])
			})
		]
	}

	return merge(commonConfig, config)
}

module.exports = (env = {}) => {
	if (!env.development) {

		commonConfig.mode = "production"
		delete commonConfig.devtool
		commonConfig.optimization = {
			minimize: true,
			minimizer: [new TerserPlugin()]
		}
	}

	const clientAppConfig = getClientAppConfig(env)
	const createAppConfig = getCreateAppConfig(env)
	const serverAppConfig = getServerAppConfig(env)

	let clientHash = env.clientAppCid
	let createHash = env.createAppCid
	const skipIpfs = clientHash && createHash

	env.ipfs = env.ipfs || "http://127.0.0.1:5001"

	if (!env.noIpfs) {

		if (!skipIpfs) {

			//Add ipfs plugins to applications
			createAppConfig.plugins.push(new IpfsWebpackPlugin({
				name: "create",
			    rootDir: "./dist/create/",
			    ipfs: env.ipfs,
				verbose: !!env.verbose, 
			    noIpns: true
			}))

			clientAppConfig.plugins.push(new IpfsWebpackPlugin({
				name: "client",
				rootDir: "./dist/client/",
			    ipfs: env.ipfs,
				verbose: !!env.verbose, 
			    noIpns: true
			}))

			if (!env.noServer) {
				serverAppConfig.plugins.push(new IpfsWebpackPlugin({
					name: "server",
					rootDir: "./dist/server/",
					ipfs: env.ipfs,
					verbose: !!env.verbose, 
					noIpns: true
				}))
			}
		}

		if (!clientHash) {
			//Wait for client hash from client app
			createAppConfig.plugins.push(new WebpackSeriesPlugin(async ({ IpfsClientWebpackPlugin }) => {
		    	clientHash = await IpfsClientWebpackPlugin
		    }))
		}

		if (!createHash && !env.noServer) {
		    //Wait for create hash from create app
			serverAppConfig.plugins.push(new WebpackSeriesPlugin(async ({ IpfsCreateWebpackPlugin }) => {
		    	createHash = await IpfsCreateWebpackPlugin
		    }))
		}
	}

	//Add client hash to create app
    createAppConfig.plugins.push(new webpack.DefinePlugin({
     	__FLIPSTARTER_CLIENT_SITE_CID__: webpack.DefinePlugin.runtimeValue(() => {
     		return JSON.stringify(clientHash || "")
     	}, true)
    }))

	//Add create hash to server app
	!env.noServer && serverAppConfig.plugins.push(new webpack.DefinePlugin({
		__FLIPSTARTER_CREATE_PAGE_CID__: webpack.DefinePlugin.runtimeValue(() => {
			return JSON.stringify(createHash || "")
		}, true)
	}))

    //Add serve plugin for development (possibly don't add hash for this case?)
	if(env.development) {
		
		//Use static files for client page during development (Navigate directly to it, God willing)
		//Create logic overrides these hardcoded cids
		if (env.campaignFilePath || env.indexFilePath) { 
			const patterns = []
			
			if (env.campaignFilePath) {
				const campaignFilePath = typeof env.campaignFilePath === 'string' ? env.campaignFilePath : "./tests/assets/campaign.json"
				patterns.push({ from: campaignFilePath })
			}

			if (env.indexFilePath) {
				const indexFilePath = typeof env.indexFilePath === 'string' ? env.indexFilePath : "./tests/assets/index.html"
				patterns.push({ from: indexFilePath })
			}

			clientAppConfig.plugins.push(new CopyWebpackPlugin({
				patterns
			}))
		}
		
		!env.noServer && serverAppConfig.plugins.push(new WebpackCdnPlugin({
		 	modules: serverCdnModules
		}))

		createAppConfig.plugins.push(new WebpackCdnPlugin({
		 	modules: createCdnModules
		}))

		clientAppConfig.plugins.push(new WebpackCdnPlugin({
		 	modules: clientCdnModules 
		}))

		let serveApp = (env.campaignFilePath && env.indexFilePath) ? clientAppConfig : env.noServer ? createAppConfig : serverAppConfig
		let serveAppDir = (env.campaignFilePath && env.indexFilePath) ? "./dist/client" : env.noServer ? "./dist/create" : "./dist/server"
		
		serveApp.entry['webpack-plugin-serve/client'] = 'webpack-plugin-serve/client'
		serveApp.plugins.push(new Serve({
			static: serveAppDir,
			port: 55554
		}))

		// Only one webpack-plugin-serve at a time?
		// createAppConfig.entry['webpack-plugin-serve/client'] = 'webpack-plugin-serve/client'
		// createAppConfig.plugins.push(new Serve({
		// 	static: "./dist/create",
		// 	port: 55555
		// }))
	} else {

		commonConfig.mode = "development"

		!env.noServer && serverAppConfig.plugins.push(new HtmlWebpackTagsPlugin({
			tags: ['static/css/bootstrap.css']
		}))
		createAppConfig.plugins.push(new HtmlWebpackTagsPlugin({
			tags: ['static/css/bootstrap.css']
		}))
	}

	const series = [clientAppConfig, createAppConfig]

	if (!env.noServer) {
		series.push(serverAppConfig)
	}

	return WebpackSeries(series)
}

module.exports.cdnModules = { clientCdnModules, createCdnModules }