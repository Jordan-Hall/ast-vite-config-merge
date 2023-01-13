import * as ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

function mergeDeeply(first: ts.ObjectLiteralExpression, second: ts.ObjectLiteralExpression) {
	const merged = { ...first, ...second };
	for (const key in first) {
		if (first[key] && second[key] && ts.isObjectLiteralExpression(first[key]) && ts.isObjectLiteralExpression(second[key])) {
			merged[key] = mergeDeeply(first[key], second[key]);
		} else if (first[key] && second[key] && ts.isArrayLiteralExpression(first[key]) && ts.isArrayLiteralExpression(second[key])) {
			// if both are array, you can use concat to merge them
			merged[key] = ts.factory.createArrayLiteralExpression(first[key].elements.concat(second[key].elements));
		}
	}
	return merged;
}

export function mergeFile(path1: string, path2: string, destination: string) {
	const code1 = readFileSync(path1, "utf-8");
	const code2 = readFileSync(path2, "utf-8");
	const sourceFile1 = ts.createSourceFile(path1, code1, ts.ScriptTarget.Latest);
	const sourceFile2 = ts.createSourceFile(path2, code2, ts.ScriptTarget.Latest);

	// Find the exported object in both files
	let exportedObject1, exportedObject2;
	for (const statement of sourceFile1.statements) {
		if (ts.isExportAssignment(statement) && ts.isObjectLiteralExpression(statement.expression)) {
			exportedObject1 = statement.expression;
		}
	}
	for (const statement of sourceFile2.statements) {
		if (ts.isExportAssignment(statement) && ts.isObjectLiteralExpression(statement.expression)) {
			exportedObject2 = statement.expression;
		}
	}

	//deep merge of objects and arrays
	const merged = mergeDeeply(exportedObject1, exportedObject2);

	// Replace the exported object with the merged object
	exportedObject1.properties = merged.properties;

	// Generate new code using the updated AST
	const printer = ts.createPrinter();
	const newCode = printer.printFile(sourceFile1);

	// Create the folder if it doesn't exist
	const folder = dirname(destination);
	try {
		mkdirSync(folder, { recursive: true });
	} catch (err) {
		if (err.code !== "EEXIST") {
			throw err;
		}
	}
	// write the new code to the destination file
	writeFileSync(destination, newCode);
}
