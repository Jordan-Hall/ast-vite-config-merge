
const isProd = process.env.NODE_ENV === 'production';
const combineMediaQueries = () => { };
const combineSelectors = (obj) => {}
const autoprefixer = () => { };
const imageMin = (obj) => { };
const compress = (obj) => { };
export default {
	css: {
		postcss: {
			plugins: [
				combineMediaQueries(),
				combineSelectors({ removeDuplicatedValues: true }),
				autoprefixer(),
			],
		},
	},
	build: {
		minify: isProd,
	},
	plugins: [
		imageMin({
			svgo: {
				// https://github.com/svg/svgo#built-in-plugins
				plugins: [
					{ name: 'RemoveTitle', active: false },
					{ name: 'RemoveDescription', active: false },
					{ name: 'RemoveViewBox', active: false },
					{ name: 'removeDimensions', active: true },
					{ name: 'removeScriptElement', active: true },
					{ name: 'removeStyleElement', active: true },
				],
			},
		}),
		compress({
			algorithm: 'brotliCompress',
		}),
	],
};