
const isProd = process.env.NODE_ENV === 'production';

export default {
	css: {
		postcss: {
			plugins: [
				'a'
			],
		},
	},
	build: {
		minify: isProd,
	},
	plugins: [
		'b'
	],
};