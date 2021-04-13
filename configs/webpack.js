const { merge } = require('webpack-merge')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = (webpack, config, overrideRules = false) => {

	const commonConfig = {
		mode: "development",
		watch: false,
		devtool: 'source-map',
		stats: 'errors-only',
		resolve: {
		  fallback: {
			  tls: false,
			  net: false,
			  assert: require.resolve("assert"),
			  util: require.resolve("util"),
			  url: require.resolve("url/"),
			  stream: require.resolve("stream-browserify"),
			  crypto: require.resolve("crypto-browserify"),
			  process: require.resolve("process/browser"),
			  http: require.resolve("stream-http"),
			  https: require.resolve("https-browserify"),
			  buffer: require.resolve("buffer/"),
			  events: require.resolve("events/")
		  },
		},
		module: {
		  rules: (!overrideRules && [
			{ test: /\.html$/, use: 'html-loader' },
			{ 
			  test: /\.css$/, 
			  use: [{
					loader: 'file-loader',
					options: {
						name: 'static/css/[name].[ext]',
					}
			  }, {
				  loader: 'extract-loader',
				  options: {
					  publicPath: '../../'
				  }
			  }, {
				  loader: 'css-loader'
			  }] 
			},
			{ 
				test: /\.(png|jpe?g|gif|woff2|woff|mp3)$/, 
				loader: 'file-loader',
				options: {
					name: 'static/media/[name].[ext]',
					publicPath: ''
				}
			},
			{
			  test: /\.sql$/i,
			  loader: 'raw-loader',
			},
			{
			  test: /\.(node)$/i,
			  loader: 'node-loader',
			  options: {
				  name: 'build/[name].[ext]'
			  }
			}
		  ])
		},
		plugins: [
		  new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
		  new webpack.ProvidePlugin({
			  process: 'process',
			  Buffer: ['buffer', 'Buffer'],
			})
		],
	}

	if (process.env.NODE_ENV === "production") {

		commonConfig.mode = "production"
		delete commonConfig.devtool
		commonConfig.optimization = {
			minimize: true,
			minimizer: [new TerserPlugin({
				exclude: /\/*.html/,
				terserOptions: {
					keep_fnames: true,
					safari10: true,
				},
			})]
		}
	}

	return merge(commonConfig, config)
}