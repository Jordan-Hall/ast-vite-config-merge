import * as ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mergeViteSourceFiles } from './merge-vite-source-file';

export function mergeViteConfigFile(path1: string, path2: string, destination: string, target: ts.ScriptTarget = ts.ScriptTarget.Latest): void {
	const code1 = readFileSync(path1, "utf-8");
	const code2 = readFileSync(path2, "utf-8");
	const sourceFile1 = ts.createSourceFile(path1, code1, target);
	const sourceFile2 = ts.createSourceFile(path2, code2, target);
	const newFile = mergeViteSourceFiles(sourceFile1, sourceFile2);
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	// Create the directory if it doesn't exist
	const dir = dirname(destination);
	if (!existsSync(dir)) {
		mkdirSync(dir);
	}

	// Write the merged file to the destination
	writeFileSync(destination, printer.printFile(newFile), "utf-8");
}