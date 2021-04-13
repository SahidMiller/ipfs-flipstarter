const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')

const path = require('path')

const plugins = []
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
                include: ['./dist'],
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
        }), new HtmlWebpackTagsPlugin({
            tags: ['static/css/bootstrap.css']
        }),
        ...plugins
    ]
})