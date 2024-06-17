/*eslint no-console: "off"*/
/*eslint-disable max-len */

const describeFunction = require('./main.js');

function assertHasSubset(obj, subset) {
	let violations = [];
	function _isSubset(superObj, subObj, path = '') {
		return Object.keys(subObj).map(ele => {
			const subpath = path + '.' + ele;
			let matches;
			if (subObj[ele] instanceof Object) {
				matches = _isSubset(superObj[ele], subObj[ele], subpath);
			} else {
				const val = (superObj === undefined) ? NaN : superObj[ele];
				matches = subObj[ele] === val;
				if (!matches) {
					violations.push(`${subpath}: ${val} != ${subObj[ele]}`);
				}
			}
			return matches;
		}).every(b => b);
	}
	console.assert(_isSubset(obj, subset), violations);
}

function f0(self, meme, init) {
	return [self, meme, init];
}
assertHasSubset(
	describeFunction(f0),
	{
		minArgs: 3,
		maxArgs: 3,
		name: 'f0',
		isArrowFunction: false,
		isAsync: false,
		parameters: [
			{ name: 'self', destructureType: null },
			{ name: 'meme', destructureType: null },
			{ name: 'init', destructureType: null }
		]
	}
);

function f1(str = 'hello', arr = ['what\'s up']) {
	return [str, arr];
}
assertHasSubset(
	describeFunction(f1),
	{
		minArgs: 0,
		name: 'f1',
		isArrowFunction: false,
		isAsync: false,
		parameters: [
			{ name: 'str', hasDefault: true, destructureType: null },
			{ name: 'arr', hasDefault: true, destructureType: null },
		]
	}
);

let f2 = (meme, param) => [meme, param];
assertHasSubset(
	describeFunction(f2),
	{
		minArgs: 2,
		name: 'f2',
		isArrowFunction: true,
		isAsync: false,
		parameters: [
			{ name: 'meme', hasDefault: false, destructureType: null },
			{ name: 'param', hasDefault: false, destructureType: null },
		]
	}
);

async function f3(ids, {
	fetch = false,
	filter = user => user,
	arr = []
} = {}) {
	return [ids, fetch, filter.toString(), arr];
}

assertHasSubset(
	describeFunction(f3),
	{
		minArgs: 1,
		maxArgs: 2,
		name: 'f3',
		isArrowFunction: false,
		isAsync: true,
		parameters: [
			{ name: 'ids', hasDefault: false, destructureType: null },
			{ hasDefault: true, destructureType: 'object' },
		]
	}
);

async function f4({
	item1,
	item2 = {
		prop1: true,
		prop2: false,
		prop3: ['array', 'of', 'strings']
	}
} = {}, [item3, item4, [item5, item6]]) {
	return [item1, item2, item3, item4, item5, item6];
}

assertHasSubset(
	describeFunction(f4), 
	{
		minArgs: 0,
		maxArgs: 2,
		name: 'f4',
		isArrowFunction: false,
		isAsync: true,
		parameters: [
			{ hasDefault: true, destructureType: 'object' },
			{ hasDefault: false, destructureType: 'array' },
		]
	}
);

// Works on classes too.
class f5 {
	constructor({
		item1,
		item2 = {
			prop1: true,
			prop2: false,
			prop3: ['array', 'of', 'strings']
		}
	} = {}, [item3, item4, [item5, item6]]) {
		return [item1, item2, item3, item4, item5, item6];
	}
}
assertHasSubset(
	describeFunction(f5),
	{
		minArgs: 0,
		maxArgs: 2,
		name: 'f5',
		isArrowFunction: false,
		isAsync: false,
		parameters: [
			{ hasDefault: true, destructureType: 'object' },
			{ hasDefault: false, destructureType: 'array' },
		]
	}
);

// Works on Function subclasses with overridden toString.
class FunctionTestClass extends Function {
	toString() {
		return '';
	}
}
// Same definition as f4
const f6 = new FunctionTestClass(
	`{
		item1,
		item2 = { /* Get a load of this complicated [...arg] */
			prop1: true,
			prop2: false,
			prop3: ['array', 'of', 'strings']
		}
	} = {}`,
	'[item3, item4, [item5, item6]]', 
	'return [item1, item2, item3, item4, item5, item6];');
assertHasSubset(
	describeFunction(f6),
	{
		minArgs: 0,
		maxArgs: 2,
		isArrowFunction: false,
		isAsync: false,
		parameters: [
			{ hasDefault: true, destructureType: 'object' },
			{ hasDefault: false, destructureType: 'array' },
		]
	}
);

// Recognizes spread syntax.
function f7(
	name,  // Comment. ,name, other {...args}, maybe
	...otherArgs /* Block comment!!!!. {}[][args][] */
) {
	return [name, ...otherArgs];
}
assertHasSubset(
	describeFunction(f7),
	{
		minArgs: 1,
		maxArgs: Infinity,
		name: 'f7',
		isArrowFunction: false,
		isAsync: false,
		parameters: [
			{ name: 'name', hasDefault: false, destructureType: null },
			{ name: 'otherArgs', hasDefault: false, destructureType: 'spread' },
		]
	}
);

const f8 = (/* Nothing! */) => 'nothing';
assertHasSubset(
	describeFunction(f8),
	{
		minArgs: 0,
		maxArgs: 0,
		name: 'f8',
		isArrowFunction: true,
		isAsync: false,
		parameters: []
	}
);