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
			return p.name && ts.isIdentifier(p.name) && p.name.text === prop.name?.text as string;
		});
		if (existingProp) {
			if (ts.isObjectLiteralExpression(existingProp.initializer) && ts.isObjectLiteralExpression(prop.initializer)) {
				existingProp.initializer = mergeDeeply(existingProp.initializer, prop.initializer);
			} else if (ts.isArrayLiteralExpression(existingProp.initializer) && ts.isArrayLiteralExpression(prop.initializer)) {
				existingProp.initializer = ts.factory.createArrayLiteralExpression(existingProp.initializer.elements.concat(prop.initializer.elements));
			} else {
				existingProp.initializer = prop.initializer;
			}
		} else {
			mergedProperties.push(prop);
		}
	}

	return ts.factory.createObjectLiteralExpression(mergedProperties);
}