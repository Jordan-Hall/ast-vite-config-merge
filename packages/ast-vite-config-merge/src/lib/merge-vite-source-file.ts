/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ts from 'typescript';
import { mergeDeeply } from './merge-deeply';

export function mergeViteSourceFiles(sourceFile1: ts.SourceFile, sourceFile2: ts.SourceFile):ts.SourceFile {


	let exportedObject1, exportedObject2, exportedFunction1, exportedFunction2, statement1, statement2;
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
		(exportedObject1 as any).properties = merged.properties;
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
				ts.factory.createArrayLiteralExpression([(exportedFunction1 as any).body, (exportedFunction2 as any).body])
			)
		} else {
			const statements = [...(exportedFunction1.body as any).statements, ...(exportedFunction2.body as any).statements];
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
		const merged = mergeDeeply(exportedObject1 as ts.ObjectLiteralExpression, exportedObject2 as ts.ObjectLiteralExpression);
		(exportedObject1 as any).properties = merged.properties;
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
		if (ts.isObjectLiteralExpression((returnStatement as any)?.expression)) {
			const merged = mergeDeeply(obj, (returnStatement as any).expression);
			(returnStatement as any).expression.properties = merged.properties;
		} else {
			(returnStatement as any).expression = obj;
		}
		(func as any).body = returnStatement;
	}

	// Create a new TypeScript file
	const newFile = ts.createSourceFile("merge.ts", "", ts.ScriptTarget.Latest);
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

		const updateStatement = (statement: any, func: any) => {
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
		if (ts.isCallExpression((statement1 as ts.ExportAssignment).expression)) {
			newFileStatements.push(updateStatement(statement1, func));
		} else {
			newFileStatements.push(updateStatement(statement2, func));
		}
	} else if (obj) {
		(statement1 as any).expression = obj;
		newFileStatements.push(statement1 as ts.ExportAssignment);
	}


	// Write the merged file to the destination
	return ts.factory.updateSourceFile(newFile, newFileStatements);
}