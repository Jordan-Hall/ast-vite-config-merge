import { mergeFile } from './merge-vite-configs';

function main() {
	mergeFile('vite.config.ts', 'vite.config2.ts', 'vite.config.merged.ts');
}


main();