const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const { WebpackPluginServe: Serve } = require('webpack-plugin-serve')
const WebpackCdnPlugin = require('webpack-cdn-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = (env = {}) => {

    const plugins = []
    const serveApp = {}
    
    //Use static files for client page during development (Navigate directly to it, God willing)
    //Create logic overrides these hardcoded cids
    if (process.env.NODE_ENV === "development") {
        
        if(env.campaignFilePath || env.indexFilePath) { 
            const patterns = []
            
            if (env.campaignFilePath) {
                const campaignFilePath = typeof env.campaignFilePath === 'string' ? env.campaignFilePath : "../../tests/assets/campaign.json"
                patterns.push({ from: campaignFilePath })
            }
    
            if (env.indexFilePath) {
                const indexFilePath = typeof env.indexFilePath === 'string' ? env.indexFilePath : "../../tests/assets/index.html"
                patterns.push({ from: indexFilePath })
            }
    
            plugins.push(new CopyWebpackPlugin({
                patterns
            }))
    
            serveApp['webpack-plugin-serve/client'] = 'webpack-plugin-serve/client'
            plugins.push(new Serve({
                static: "./dist/",
                port: 55554
            }))
        }
    
        plugins.push(new WebpackCdnPlugin({
            modules: require('./cdn.modules')
        }))
    } 

    return merge(webpack, {
        name: "client",
        target: 'web',
        entry: {
            app: './index.js',
            ...serveApp
        },
        output: { 
            path: path.join(__dirname, './dist/'),
            filename: "static/js/[name].js",
            publicPath: './'
        },
        plugins: [
            new RemovePlugin({
                before: {
                    include: [
                        './dist/'
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
                template: '../../public/templates/index.html',
                //Place our file as a template in the create project, God willing.
                filename: './static/templates/index.html',
                publicPath: './',
                inject: 'body',
                favicon: "../../public/img/logo.ico",
            }),
            ...plugins
        ]
    })
}