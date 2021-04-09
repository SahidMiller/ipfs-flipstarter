const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const path = require('path')

module.exports = (env = {}) => {

    const plugins = []
    const serveApp = {}
    
    //Use static files for client page during development (Navigate directly to it, God willing)
    //Create logic overrides these hardcoded cids
    if (process.env.NODE_ENV === "development") {
        
        const patterns = []
        
        if (process.env.FLIPSTARTER_CAMPAIGN_JSON) {
            patterns.push({ from: process.env.FLIPSTARTER_CAMPAIGN_JSON })
        }

        if (process.env.FLIPSTARTER_INDEX_HTML) {
            patterns.push({ from: process.env.FLIPSTARTER_INDEX_HTML })
        }

        plugins.push(new CopyWebpackPlugin({ patterns }))
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