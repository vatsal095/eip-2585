const fs = require("fs");
const webpack = require('webpack');
const path = require('path');
const config = require('sapper/config/webpack.js');
const pkg = require('./package.json');
const sveltePreprocess = require('svelte-preprocess')

const useProdContract = process.env.PROD_CONTRACT == 'true';
const mode = process.env.NODE_ENV || "development";
// const prod = mode === "production";
const dev = mode === 'development';
const hot = dev && process.env.HOT != 0

const contractsInfoPath = path.resolve(__dirname, "./src/contractsInfo.json");
const devContractsInfoPath = path.resolve(
  __dirname,
  "./src/dev_contractsInfo.json"
);
const contractsInfoExists = fs.existsSync(contractsInfoPath);
// const devContractsInfoExists = fs.existsSync(devContractsInfoPath);
let contractsInfo;
if ((useProdContract || !dev) && contractsInfoExists) {
	console.log('using production contracts');
	contractsInfo = contractsInfoPath;
} else {
  console.log('using dev contracts');
	contractsInfo = devContractsInfoPath;
}


const alias = { svelte: path.resolve('node_modules', 'svelte'), contractsInfo };
const extensions = ['.mjs', '.js', '.json', '.svelte', '.html'];
const mainFields = ['svelte', 'module', 'browser', 'main'];
const preprocess = sveltePreprocess({ postcss: true });

module.exports = {
	client: {
		entry: config.client.entry(),
		output: config.client.output(),
		resolve: { alias, extensions, mainFields },
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader-hot',
						options: {
							preprocess,
							dev, // NOTE dev mode is REQUIRED for HMR
							hydratable: true,
              				hotReload: hot,
							hotOptions: {
								// optimistic will try to recover from runtime errors during
								// component init (instead of doing a full reload)
								optimistic: true
							}
						}
					}
				}
			]
		},
		mode,
		plugins: [
			// pending https://github.com/sveltejs/svelte/issues/3632
			hot && new webpack.HotModuleReplacementPlugin(),
			new webpack.DefinePlugin({
				'process.browser': true,
				'process.env.NODE_ENV': JSON.stringify(mode)
			}),
		].filter(Boolean),
		devtool: dev && 'inline-source-map'
	},

	server: {
		entry: config.server.entry(),
		output: config.server.output(),
		target: 'node',
		resolve: { alias, extensions, mainFields },
		externals: Object.keys(pkg.dependencies).concat('encoding'),
		module: {
			rules: [
				{
					test: /\.(svelte|html)$/,
					use: {
						loader: 'svelte-loader-hot',
						options: {
							preprocess,
							css: false,
							generate: 'ssr',
							dev
						}
					}
				}
			]
		},
		mode: process.env.NODE_ENV,
		performance: {
			hints: false // it doesn't matter if server.js is large
		}
	},

	serviceworker: {
		entry: config.serviceworker.entry(),
		output: config.serviceworker.output(),
		mode: process.env.NODE_ENV
	}
};
