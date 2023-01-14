import { mergeViteConfigFile } from 'ast-vite-config-merge';
import { join } from 'path';

export function runner() {
	mergeViteConfigFile(
		`path to config`,
		`path to config 2`,
		join(__dirname, 'vite.config.merged.ts')
	)
}