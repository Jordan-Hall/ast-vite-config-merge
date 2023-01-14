import * as ts from 'typescript';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { mergeDeeply } from './merge-deeply';

export function mergeFile(path1: string, path2: string, destination: string) {
	const code1 = readFileSync(path1, "utf-8");
	const code2 = readFileSync(path2, "utf-8");
	const sourceFile1 = ts.createSourceFile(path1, code1, ts.ScriptTarget.Latest);
	const sourceFile2 = ts.createSourceFile(path2, code2, ts.ScriptTarget.Latest);

	let exportedObject1, exportedObject2, exportedFunction1, exportedFunction2, isCallFunctionExpression1, isCallFunctionExpression2, statement1, statement2;
	for (const statement of sourceFile1.statements) {
		if (ts.isExportAssignment(statement)) {
			statement1 = statement;
			if (ts.isObjectLiteralExpression(statement.expression)) {
				exportedObject1 = statement.expression;
			} else if (ts.isCallExpression(statement.expression)) {
				if (ts.isFunctionExpression(statement.expression.expression) || ts.isArrowFunction(statement.expression.expression)) {
					exportedFunction1 = statement.expression.expression;
				} else if (ts.isFunctionExpression(statement.expression.arguments[0]) || ts.isArrowFunction(statement.expression.arguments[0])) {
					exportedFunction1 = statement.expression.arguments[0];
					isCallFunctionExpression1 = true;
				}
			} else if (ts.isFunctionExpression(statement.expression)) {
				exportedFunction1 = statement.expression;
			}
		}
	}
	for (const statement of sourceFile2.statements) {
		if (ts.isExportAssignment(statement)) {
			statement2 = statement;
			if (ts.isObjectLiteralExpression(statement.expression)) {
				exportedObject2 = statement.expression;
			} else if (ts.isCallExpression(statement.expression)) {
				if (ts.isFunctionExpression(statement.expression.expression) || ts.isArrowFunction(statement.expression.expression)) {
					exportedFunction2 = statement.expression.expression;
				} else if (ts.isFunctionExpression(statement.expression.arguments[0]) || ts.isArrowFunction(statement.expression.arguments[0])) {
					exportedFunction2 = statement.expression.arguments[0];
					isCallFunctionExpression2;
				}
			} else if (ts.isFunctionExpression(statement.expression)) {
				exportedFunction2 = statement.expression;
			}
		}
	}
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
		// merge the two functions
		if (ts.isArrowFunction(exportedFunction1) && ts.isArrowFunction(exportedFunction2)) {
			func = ts.factory.createArrowFunction(
				undefined,
				undefined,
				[],
				undefined,
				ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
				ts.factory.createArrayLiteralExpression([exportedFunction1.body, exportedFunction2.body])
			)
		} else {
			let statements = [...exportedFunction1.body.statements, ...exportedFunction2.body.statements];
			func = ts.factory.createFunctionExpression(
				exportedFunction1.modifiers,
				exportedFunction1.asteriskToken,
				exportedFunction1.name,
				exportedFunction1.typeParameters,
				exportedFunction1.parameters,
				exportedFunction1.type,
				ts.factory.createBlock(statements)
			);
		}
	}
	// If both exports are objects, use the existing deep merge logic
	if (obj && !func) {
		const merged = mergeDeeply(exportedObject1, exportedObject2);
		exportedObject1.properties = merged.properties;
	}
	// If one export is an object and the other is a function, merge the object into the function return statement
	else if (obj && func) {
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
		if (ts.isObjectLiteralExpression(returnStatement.expression)) {
			const merged = mergeDeeply(obj, returnStatement.expression);
			returnStatement.expression.properties = merged.properties;
		} else {
			returnStatement.expression = obj;
		}
		func.body = returnStatement;
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
	if (func) {

		const updateStatement = (statement: any , func: any) => {
			if (ts.isCallExpression(statement.expression)) {
				if (ts.isFunctionExpression(statement.expression.expression) || ts.isArrowFunction(statement.expression.expression)) {
					statement.expression.expression = func
				} else if (ts.isFunctionExpression(statement.expression.arguments[0]) || ts.isArrowFunction(statement.expression.arguments[0])) {
					statement.expression.arguments[0] = func;
				}
			} else if (ts.isFunctionExpression(statement.expression)) {
				statement.expression = func;
			}
			return statement;
		}
		if (ts.isCallExpression(statement1.expression)) {
			newFileStatements.push(updateStatement(statement1, func));
		} else {
			newFileStatements.push(updateStatement(statement2, func));
		}
	} else if (obj) {
		statement1.expression = obj;
		newFileStatements.push(statement1);
	}

	// Create the directory if it doesn't exist
	const dir = dirname(destination);
	if (!existsSync(dir)) {
		mkdirSync(dir);
	}

	// Write the merged file to the destination
	const newFileText = printer.printFile(ts.factory.updateSourceFile(newFile, newFileStatements));
	writeFileSync(destination, newFileText, "utf-8");
}