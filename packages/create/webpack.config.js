const merge = require('../../configs/webpack')

const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const RemovePlugin = require('remove-files-webpack-plugin')
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin')
const StyleExtHtmlWebpackPlugin = require('style-ext-html-webpack-plugin');
const VirtualModulesPlugin = require('webpack-virtual-modules');

const path = require('path')

const plugins = [];
const defer = {}
defer.promise = new Promise(res => defer.resolve = res)

module.exports = [merge(webpack, {
    name: 'create',
    entry: {
        create: './frontend.js',
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
                include: ['./public'],
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
        {
            apply: (compiler) => compiler.hooks.afterEmit.tap("DeferAfterEmitPlugin", () => {
                defer.resolve()
            })
        },
        ...plugins
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
}), merge(webpack, {
    name: 'index',
    target: 'node',
    entry: './index.js',
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
        {
            apply: (compiler) => compiler.hooks.beforeRun.tapPromise("DelayBeforeRunPlugin", () => {
                return defer.promise
            })
        },
        //TODO God willing: after emit, use the dag-loader or something to get a dag-node + cid, God willing, so it can be imported.
        new VirtualModulesPlugin({
            'node_modules/create-dag.config.js': `module.exports = {
                files: {
                    //Relative to node_modules
                    root: '../public',
                    globs: [
                        /* Make sure that files matched can be handled by your webpack loaders */
                        '**/*'
                    ]
                }
            };`,
            'node_modules/create-dag.js': `module.exports = require('dag-loader!create-dag.config');`
        })
    ]
})]