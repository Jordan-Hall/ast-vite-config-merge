import { mergeViteConfigFile } from 'ast-vite-config-merge';

export function runner() {
	mergeViteConfigFile('vite.config.ts', 'vite.config2.ts', 'vite.config.merged.ts');
}