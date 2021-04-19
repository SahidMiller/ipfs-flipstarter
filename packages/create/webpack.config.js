const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')
const StyleExtHtmlWebpackPlugin = require('style-ext-html-webpack-plugin');
const path = require('path')
const DagEntryPlugin = require('webpack-dag-entry-plugin')


module.exports = [merge(webpack, {
    name: 'create',
    entry: {
        create: './src/frontend.js',
        template: '../../public/templates/index.html'
    },
    output: { 
        path: path.join(__dirname, './public'),
        filename: "static/js/[name].js",
        publicPath: './', //Necessary with WebpackCdn
    },
    plugins: [
        new RemovePlugin({
            before: {
                include: ['./public', './dist'],
                log: false,
                logWarning: true,
                logError: true,
                logDebug: false
            },
            after: {
                include: ['./public/static/js/template.js', './public/static/js/template.js.map'],
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
            template: './views/create.html',
            chunks: ["create"],
            filename: 'index.html',
            publicPath: './',
            inject: 'body',
            favicon: "../../public/img/logo.ico",
        }),
        new HtmlWebpackTagsPlugin({
            tags: [
                'static/css/bootstrap.css',
                'static/css/codemirror.css',
                'static/css/easymde.min.css'
            ]
        }),
        new DagEntryPlugin({
            config: "./index.js",
            filename: "dist/index.js"
        })
    ]
}), merge(webpack, {
    name: 'previewTemplate',
    entry: '../../public/templates/index.html',
    output: { 
        path: path.join(__dirname, './public'),
        publicPath: './', //Necessary with WebpackCdn
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: '../../public/templates/index.html',
            filename: 'client.html',
            publicPath: './',
            inlineSource: '.(css)$' 
        }), 
        new StyleExtHtmlWebpackPlugin(),
        new RemovePlugin({
            after: {
                include: ['./public/main.js', './public/main.js.map'],
                log: false,
                logWarning: true,
                logError: true,
                logDebug: false
            },
            watch: {
                beforeForFirstBuild: true
            }
         })
    ]
})]