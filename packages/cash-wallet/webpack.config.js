const webpack = require("webpack")
const merge = require('../../configs/webpack')
const VirtualModulesPlugin = require('webpack-virtual-modules');
const RemovePlugin = require('remove-files-webpack-plugin')

const path = require("path");

const defer = {}
defer.promise = new Promise(res => defer.resolve = res)

module.exports = [merge(webpack, {
  name: "wallet",
  entry: {
    signer: "./src/index.js",
    worker: "./src/worker/worker.js",
  },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      // Not necessary unless you consume a module using `createClass`
      "create-react-class": "preact/compat/lib/create-react-class",
      // Not necessary unless you consume a module requiring `react-dom-factories`
      "react-dom-factories": "preact/compat/lib/react-dom-factories",
    },
  },
  mode: process.env.NODE_ENV,
  watch: false,
  output: {
    path: path.resolve(__dirname, "public/js"),
    filename: "[name].lib.js",
  },
  devtool: "source-map",
  watchOptions: {
    ignored: /node_modules/,
  },
  stats: {
    warnings: process.env.NODE_ENV === "development",
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        include: path.resolve(__dirname, "src"),
        exclude: path.resolve(__dirname, "src/worker"),
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: "file-loader",
            options: {
              outputPath: "../images",
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __SIGNUP_NETWORK__: JSON.stringify(process.env.NODE_ENV === "development" ? "testnet" : "mainnet"),
      __SIGNUP_HD_PATH__: JSON.stringify(process.env.SIGNUP_HD_PATH || "m/44'/0'/0'/0/0"),
      __ELECTRUM_SERVERS__: JSON.stringify(process.env.NODE_ENV === "development" ? [
        { host: "testnet.bitcoincash.network", port: 60004 },
        { host: "blackie.c3-soft.com", port: 60004 },
        { host: "electroncash.de", port: 60004 }
      ] : [
        { host: "electroncash.de", port: 60002 },
        { host: "electroncash.dk", port: 50004 },
        { host: "bch.loping.net", port: 50004 },
        { host: "electrum.imaginary.cash", port: 50004 }
      ]),
      __SIGNUP_BLOCKEXPLORER_TX__: JSON.stringify(
        process.env.NODE_ENV === "development" ?
          "https://www.blockchain.com/bch-testnet/tx/" :
          "https://blockchair.com/bitcoin-cash/transaction/")
  }), 
  {
    apply: (compiler) => compiler.hooks.afterEmit.tap("DeferAfterEmitPlugin", () => {
      defer.resolve()
    })
  }]
}, true), merge(webpack, {
  name: 'index',
  target: 'node',
  entry: './index.js',
  output: { 
      path: path.join(__dirname, './dist'),
      filename: "index.js",
      publicPath: './', //Necessary with WebpackCdn
      library: 'cashWallet',
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
        'node_modules/wallet-dag.config.js': `module.exports = {
            files: {
                //Relative to node_modules
                root: '../public',
                globs: [
                  /* Make sure that files matched can be handled by your webpack loaders */
                  '**/*'
                ]
            }
        };`,
        'node_modules/wallet-dag.js': `module.exports = require('dag-loader!wallet-dag.config');`
    })
  ]
})];
