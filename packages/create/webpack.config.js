const merge = require('../../configs/webpack')

const webpack = require('webpack')
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
        port: 55553
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
    name: 'create',
    target: 'web',
    entry: {
        create: './index.js'
    },
    output: { 
        path: path.join(__dirname, './dist'),
        filename: "static/js/[name].js",
        publicPath: './', //Necessary with WebpackCdn
    },
    plugins: [
        new RemovePlugin({
            before: {
                include: ['./dist/'],
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
            favicon: "../../public/img/logo.ico",
        }), new webpack.DefinePlugin({
            __FLIPSTARTER_CLIENT_CID__: JSON.stringify(process.env.FLIPSTARTER_CLIENT_CID)
        }),
        ...plugins
    ]
})