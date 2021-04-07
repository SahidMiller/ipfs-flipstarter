const merge = require('../../configs/webpack')

const webpack = require("webpack")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve')
const WebpackCdnPlugin = require('webpack-cdn-plugin')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')
const path = require('path')

const plugins = []
const serveApp = {}

//Use static files for client page during development (Navigate directly to it, God willing)
//Create logic overrides these hardcoded cids
if (process.env.NODE_ENV === "development") {

    serveApp['webpack-plugin-serve/client'] = 'webpack-plugin-serve/client'
    plugins.push(new Serve({
        static: "./dist/",
        port: 55552
    }))

    plugins.push(new WebpackCdnPlugin({
        modules: require('./cdn.modules')
    }))
} 

if (process.env.NODE_ENV === "production") {

    //Add tag to load local bootstrap css in production, God willing.
    plugins.push(new HtmlWebpackTagsPlugin({
        tags: ['static/css/bootstrap.css']
    }))
}

module.exports = merge(webpack, {
    name: "server",
    target: "web",
    entry: {
        index: "./index.js",
        //...serveApp
    },
    output: { 
        path: path.join(__dirname, "./dist"),
        filename: "static/js/[name].js",
        publicPath: './'
    },
    plugins: [
        new RemovePlugin({
            before: {
                include: ['./dist'],
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
            template: '../../views/server.html',
            chunks: ["index"],
            filename: 'index.html',
            inject: 'body',
            publicPath: "./",
            favicon: "../../public/img/logo.ico",
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
            ]),
            __FLIPSTARTER_CREATE_CID__: JSON.stringify(process.env.FLIPSTARTER_CREATE_CID)
        }),
        ...plugins
    ]
})