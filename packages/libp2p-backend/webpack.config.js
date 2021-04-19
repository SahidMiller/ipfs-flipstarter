const merge = require('../../configs/webpack')

const webpack = require("webpack")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')
const path = require('path')

const plugins = []
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
                include: ['./dist/*'],
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
            ])
        }),
        new HtmlWebpackTagsPlugin({
            tags: ['static/css/bootstrap.css']
        }),
        ...plugins
    ]
})