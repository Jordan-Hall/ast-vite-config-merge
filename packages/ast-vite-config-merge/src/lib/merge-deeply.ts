/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ts from 'typescript';

export function mergeDeeply(first: ts.ObjectLiteralExpression, second: ts.ObjectLiteralExpression) {
	const mergedProperties: ts.ObjectLiteralElementLike[] = [];

	// Add properties from first object
	for (const prop of first.properties) {
		mergedProperties.push(prop);
	}

	// Add properties from second object, giving priority to second object's values
	for (const prop of second.properties) {
		const existingProp = mergedProperties.find(p => {
			return p.name && ts.isIdentifier(p.name) && p.name.text === (prop.name as any)?.text as string;
		});
		if (existingProp) {
			if (ts.isObjectLiteralExpression((existingProp as any).initializer) && ts.isObjectLiteralExpression((prop as any).initializer)) {
				(existingProp as any).initializer = mergeDeeply((existingProp as any).initializer, (prop as any).initializer);
			} else if (ts.isArrayLiteralExpression((existingProp as any).initializer) && ts.isArrayLiteralExpression((prop as any).initializer)) {
				(existingProp as any).initializer = ts.factory.createArrayLiteralExpression((existingProp as any).initializer.elements.concat((prop as any).initializer.elements));
			} else {
				(existingProp as any).initializer = (prop as any).initializer;
			}
		} else {
			mergedProperties.push(prop);
		}
	}

	return ts.factory.createObjectLiteralExpression(mergedProperties);
}