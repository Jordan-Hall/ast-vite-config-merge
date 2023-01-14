import * as ts from 'typescript';
import { mergeDeeply } from './merge-deeply';

describe('mergeDeeply', () => {
	it('should merge two object literals', () => {
		const first = ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment('a', ts.createLiteral(1)),
			ts.factory.createPropertyAssignment('b', ts.createLiteral(2))
		]);
		const second = ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment('b', ts.createLiteral(3)),
			ts.factory.createPropertyAssignment('c', ts.createLiteral(4))
		]);
		const merged = mergeDeeply(first, second);
		expect(merged.properties.map(p => p.name.text)).toEqual(['a', 'b', 'c']);
		expect(merged.properties.find(p => p.name.text === 'a').initializer.text).toEqual('1');
		expect(merged.properties.find(p => p.name.text === 'b').initializer.text).toEqual('3');
		expect(merged.properties.find(p => p.name.text === 'c').initializer.text).toEqual('4');
	});

	it('should merge nested arrays', () => {
		const firstArray = ts.factory.createArrayLiteralExpression([
			ts.factory.createArrayLiteralExpression("first"),
			ts.factory.createArrayLiteralExpression("second")
		]);
		const secondArray = ts.factory.createArrayLiteralExpression([
			ts.factory.createArrayLiteralExpression("third"),
			ts.factory.createArrayLiteralExpression("fourth")
		]);

		const mergedArray = mergeDeeply(firstArray, secondArray);
		const expectedArray = ts.factory.createArrayLiteralExpression([
			ts.factory.createArrayLiteralExpression("first"),
			ts.factory.createArrayLiteralExpression("second"),
			ts.factory.createArrayLiteralExpression("third"),
			ts.factory.createArrayLiteralExpression("fourth")
		]);

		expect(mergedArray).toEqual(expectedArray);
	});

	it('should give priority to second object when keys match', () => {
		const first = ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment("firstName", ts.factory.createStringLiteral("John")),
			ts.factory.createPropertyAssignment("lastName", ts.factory.createStringLiteral("Doe"))
		]);
		const second = ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment("firstName", ts.factory.createStringLiteral("Jane")),
			ts.factory.createPropertyAssignment("age", ts.factory.createStringLiteral("30"))
		]);
		const merged = mergeDeeply(first, second);
		const expected = ts.factory.createObjectLiteralExpression([
			ts.factory.createPropertyAssignment("firstName", ts.factory.createStringLiteral("Jane")),
			ts.factory.createPropertyAssignment("lastName", ts.factory.createStringLiteral("Doe")),
			ts.factory.createPropertyAssignment("age", ts.factory.createStringLiteral("30"))
		]);
		assertObjectLiteralExpression(merged, expected);
	});
