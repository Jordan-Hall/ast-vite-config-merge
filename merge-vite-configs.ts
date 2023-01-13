import * as ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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

	let exportedObject1, exportedObject2, exportedFunction1, exportedFunction2;
	for (const statement of sourceFile1.statements) {
		if (ts.isExportAssignment(statement)) {
			if (ts.isObjectLiteralExpression(statement.expression)) {
				exportedObject1 = statement.expression;
			} else if (ts.isFunctionExpression(statement.expression)) {
				exportedFunction1 = statement.expression;
			}
		}
	}
	for (const statement of sourceFile2.statements) {
		if (ts.isExportAssignment(statement)) {
			if (ts.isObjectLiteralExpression(statement.expression) || (ts.isArrowFunction(statement.expression) && statement.expression.body)) {
				exportedObject2 = statement.expression;
			} else if (ts.isFunctionExpression(statement.expression) || (ts.isArrowFunction(statement.expression) && statement.expression.body)) {
				exportedFunction2 = statement.expression;
			}
		}
	}
	// Check which export is an object and which is a function
	let obj, func;
	if (exportedObject1 && exportedFunction2) {
		obj = exportedObject1;
		func = exportedFunction2;
	} else if (exportedFunction1 && exportedObject2) {
		obj = exportedObject2;
		func = exportedFunction1;
	} else if (exportedObject1 && exportedObject2) {
		const merged = mergeDeeply(exportedObject1, exportedObject2);
		exportedObject1.properties = merged.properties;
		obj = exportedObject1;
	} else if (exportedFunction1 && exportedFunction2) {

		/// merge functions
	}
	// If both exports are objects, use the existing deep merge logic
	if (obj && !func) {
		//deep merge of objects and arrays
		const merged = mergeDeeply(exportedObject1, exportedObject2);

		// Replace the exported object with the merged object
		exportedObject1.properties = merged.properties;
	}
	// If one export is an object and the other is a function, merge the object into the function return statement
	else if (obj && func) {
		// Get the return statement of the function
		let returnStatement;
		if (ts.isArrowFunction(func)) {
			returnStatement = func.body;
		} else {
			for (const statement of func.body.statements) {
				if (ts.isReturnStatement(statement)) {
					returnStatement = statement;
					break;
				}
			}
		}
		// If the return statement is an object, deep merge it with the other object
		if (ts.isObjectLiteralExpression(returnStatement.expression)) {
			const merged = mergeDeeply(obj, returnStatement.expression);
			returnStatement.expression.properties = merged.properties;
		}
		// If the return statement is not an object, just set it to the other object
		else {
			returnStatement.expression = obj;
		}
	}
	// Create a new TypeScript file
	const newFile = ts.createSourceFile("newFile.ts", "", ts.ScriptTarget.Latest);
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const newFileStatements: ts.Statement[] = [];

	// Combine the import statements
	newFileStatements.push(...sourceFile1.statements.filter(s => ts.isImportDeclaration(s)));
	newFileStatements.push(...sourceFile2.statements.filter(s => ts.isImportDeclaration(s)));

	// Combine the variable declarations
	newFileStatements.push(...sourceFile1.statements.filter(s => ts.isVariableStatement(s)));
	newFileStatements.push(...sourceFile2.statements.filter(s => ts.isVariableStatement(s)));

	// Combine the function definitions
	newFileStatements.push(...sourceFile1.statements.filter(s => ts.isFunctionDeclaration(s)));
	newFileStatements.push(...sourceFile2.statements.filter(s => ts.isFunctionDeclaration(s)));

	// Add the merged default export
	if (obj) {
		newFileStatements.push(ts.factory.createExportAssignment(undefined, false, obj));
	} else if (func) {
		newFileStatements.push(ts.factory.createExportAssignment(undefined, true, func));
	}
	newFileStatements.push(obj ? obj : func);

	// Create the directory if it doesn't exist
	const dir = dirname(destination);
	if (!existsSync(dir)) {
		mkdirSync(dir);
	}

	// Write the merged file to the destination
	const newFileText = printer.printFile(ts.factory.updateSourceFile(newFile, newFileStatements));
	writeFileSync(destination, newFileText, "utf-8");
}