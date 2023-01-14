import { mergeViteConfigFile } from '../src/merge-vite-configs';

function main() {
	mergeViteConfigFile('vite.config.ts', 'vite.config2.ts', 'vite.config.merged.ts');
}


main();