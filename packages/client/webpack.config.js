const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const DagEntryPlugin = require('webpack-dag-entry-plugin');

const path = require('path')

module.exports = (env = {}) => {

    const plugins = []
    
    //Use static files for client page during development (Navigate directly to it, God willing)
    //Create logic overrides these hardcoded cids
    if (process.env.NODE_ENV === "development") {
        
        const patterns = []
        
        if (process.env.FLIPSTARTER_CAMPAIGN_JSON) {
            patterns.push({ from: process.env.FLIPSTARTER_CAMPAIGN_JSON, to: "" })
        }

        if (process.env.FLIPSTARTER_INDEX_HTML) {
            patterns.push({ from: process.env.FLIPSTARTER_INDEX_HTML, to: "" })
        }

        if (patterns.length) {
            plugins.push(new CopyWebpackPlugin({ patterns }))
        }
    } 

    return merge(webpack, {
        name: "client",
        target: 'web',
        entry: {
            app: './src/index.js',
        },
        output: { 
            path: path.join(__dirname, './public/'),
            filename: "static/js/[name].js",
            publicPath: './'
        },
        plugins: [
            new RemovePlugin({
                before: {
                    include: [
                        './public/',
                        './dist'
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
            new DagEntryPlugin({
                config: "./index.js",
                filename: "dist/index.js"
            }),
            ...plugins
        ]
    })
}