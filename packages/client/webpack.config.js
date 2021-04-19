const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const VirtualModulesPlugin = require('webpack-virtual-modules');

const path = require('path')

module.exports = (env = {}) => {

    const plugins = []
    const serveApp = {}
    
    const defer = {}
    defer.promise = new Promise(res => defer.resolve = res)

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

    return [merge(webpack, {
        name: "client",
        target: 'web',
        entry: {
            app: './index.js',
            ...serveApp
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
                        './public/'
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
            {
                apply: (compiler) => compiler.hooks.afterEmit.tap("DeferAfterEmitPlugin", () => {
                    defer.resolve()
                })
            },
            ...plugins
        ]
    }), merge(webpack, {
        name: 'index',
        target: 'node',
        entry: './client-dag.config.js',
        output: { 
            path: path.join(__dirname, './dist'),
            filename: "index.js",
            publicPath: './', //Necessary with WebpackCdn
            library: 'createDag',
            libraryTarget: 'umd',
            globalObject: 'this',
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
            {
                apply: (compiler) => compiler.hooks.beforeRun.tapPromise("DelayBeforeRunPlugin", () => {
                    return defer.promise
                })
            },
            //TODO God willing: after emit, use the dag-loader or something to get a dag-node + cid, God willing, so it can be imported.
            new VirtualModulesPlugin({
                'node_modules/client-dag.config.js': `module.exports = {
                    files: {
                        //Relative to node_modules
                        root: '../public',
                        globs: [
                            /* Make sure that files matched can be handled by your webpack loaders */
                            '**/*'
                        ]
                    }
                };`,
                'node_modules/client-dag.js': `module.exports = require('dag-loader!client-dag.config');`
            })
        ]
    })]
}