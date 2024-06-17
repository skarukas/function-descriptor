/**
 * Defined outside the constructor so that they are interpreted once and stored in memory
 * @property {regex} arrow - Used to parse arrow functions, execs arguments section
 * @property {regex} func - Used to parse functions defined with a keyword, execs arguments
 * @property {regex} comments - Finds comments for removal
 * @property {regex} object - Finds parameters that are decomposed objects
 * @property {regex} array - Finds parameters that are decomposed arrays
 * @type {Object}
 */
const _REGEX = {
	arrow: /^\(?([^(^)]*)\)?\s*=>/,
	func: /(?:function|static|async)?\s*\w+\s?\(([^(^)]*)\)/,
	comments: /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
	object: /^{([\w\s=>"',:{}[\]\\]*)*}$/,
	array: /^\[[\w\s=>"',:{}[\]\\]*]$/,
	json: /\{.*:\{.*:.*\}\}/g
};

class ParamDescriptor {
	constructor(name, hasDefault, rawName, destructureType=null) {
		this.name = name;
		this.rawName = rawName;
		this.destructureType = destructureType;
		this.hasDefault = hasDefault;
	}
	static fromString(paramString) {
		let name, destructureType = null, hasDefault = false;
		if (paramString.indexOf('=') !== -1) {
			paramString = FunctionDescriptor.splitEquals(paramString)
				.slice(0, -1)
				.join('=')
				.trim();
			hasDefault = true;
		}
		const rawName = FunctionDescriptor.decompose(paramString);
		if (typeof rawName == 'string') {
			if (rawName.startsWith('...')) {
				name = rawName.replace('...', '');
				destructureType = 'spread';
			} else {
				name = rawName;
			}
		} else if (rawName instanceof Array) {
			destructureType = 'array';
		} else if (rawName instanceof Object) {
			destructureType = 'object';
		}
		return new ParamDescriptor(name, hasDefault, rawName, destructureType);
	}
}

// https://stackoverflow.com/questions/46118496/
//  asyncfunction-is-not-defined-yet-mdn-documents-its-usage
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

class FunctionDescriptor {
	/**
   * @constructor
   * @param {Function} f - The function for which parameter names should be returned
   */
	constructor(f) {
		this.f = f;
		this.name = this.f.name;
		this.isAsync = (this.f instanceof AsyncFunction);
		this.parameters = FunctionDescriptor.parseArguments(this.f);
		this.minArgs = this.f.length;
		this.maxArgs = FunctionDescriptor._getMaxArgs(this.parameters);
		this.functionString = FunctionDescriptor.stringify(this.f);
		this.isArrowFunction = _REGEX.arrow.test(this.functionString);
	}

	static _getMaxArgs(parameters) {
		const hasSpreadParam = parameters.some(p => p.destructureType == 'spread');
		return hasSpreadParam ? Infinity : parameters.length;
	}

	/**
   * The string version of the function passed to the constructor
   * @name getParamNames#str
   * @type {string}
   * @private
   */
	static stringify(f) {
		// Accounts for Function subclasses with overridden toString().
		const boundToString = Function.prototype.toString.bind(f);
		return boundToString().trim();
	}

	/**
   * @name getParamNames#arg
   * @type {string}
   * @private
   */
	static getArgsSection(functionString) {
		if (functionString.replace(/\s/g, '').includes('{[nativecode]}')) {
			throw new Error(
				'FunctionDescriptors cannot be created for native functions. '
       + 'Given: ' + functionString);
		}
		const match = functionString.match(_REGEX.arrow)
      || functionString.match(_REGEX.func);
		if (match && match.length) {
			// match[0] will contain the full function definition, which we don't 
			// want.
			return match[1];
		} else {
			throw new Error(`Function parsing failed: ${functionString}.
      Expected to match ${_REGEX.arrow} or ${_REGEX.func}`);
		}
	}

	/**
   * Returns each parameter formatted perfectly - decompositions are in their object format
   * Arrays - listed as an array of strings where each string is the decomposed name
   * Objects - listed as an object with key: decomposed name, and value: true|default value
   * @name getParaNames#params
   * @type {*[]}
   * @private
   */
	static parseArguments(f) {
		const funcString = FunctionDescriptor.stringify(f);
		const rawArgString = FunctionDescriptor.getArgsSection(funcString);
		const cleanedArgString = rawArgString.replace(_REGEX.comments, '');
		const splitArgStrings = FunctionDescriptor.splitArgsByCommas(cleanedArgString);
		return splitArgStrings.map(ParamDescriptor.fromString);
	}

	/**
   * Splits a single at any '=' sign, critically ignoring any '=>' signs
   * @param {string} str
   * @returns {string[]}
   * @private
   */
	static splitEquals(str) {
		return str
			.trim()
			.split('=')
			.reduce((acc, curr) => {
				if (curr.startsWith('>')) acc[acc.length - 1] += '=' + curr;
				else acc.push(curr);
				return acc;
			}, []);
	}

	/**
   * Splits a string at any ',' sign, keeping objects and arrays intact
   * @param {string} str
   * @returns {string[]}
   * @private
   */
	static splitArgsByCommas(str) {
		if (str.trim() == '') {
			return [];
		}
		let obj = null;
		let arr = str.split(',').map(i => i.trim());
		return arr.reduce((acc, curr) => {
			if (obj) acc[acc.length - 1] += ', ' + curr.trim();
			else acc.push(curr.trim());
			if (curr.includes('[')) obj = ']';
			else if (curr.includes('{')) obj = '}';
			if (curr.endsWith(obj)) obj = null;
			return acc;
		}, []);
	}

	/**
   * Takes a string input to a function and decomposes it, like a compiler, to get variable names
   * Is recursive since decomposing Arrays and Objects might have further decomposition properties
   * @param {string} str
   * @returns {*[]}
   * @private
   */
	static decompose(str) {
		if (_REGEX.object.test(str)) {
			if (str === '{}') return {};
			let obj = {};
			const val = str.slice(1, -1).trim();
			const entries = FunctionDescriptor.splitArgsByCommas(val);
			for (let entry of entries) {
				let [key, value] = FunctionDescriptor.splitEquals(entry);
				if (typeof value === 'undefined') {
					[key, value] = key.split(':');
				}
				if (typeof value !== 'undefined') {
					value = FunctionDescriptor.decompose(value.trim());
				}
				obj[key.trim()] = value;
			}
			return obj;
		} else if (_REGEX.array.test(str)) {
			if (str === '[]') return [];
			let arr = FunctionDescriptor.splitArgsByCommas(str.slice(1, -1).trim());
			for (let i = 0; i < arr.length; i++) {
				arr[i] = FunctionDescriptor.decompose(arr[i]);
			}
			return arr;
		} else if (str.trim() === 'true') {
			return true;
		} else if (str.trim() === 'false') {
			return false;
		}
		str = str.replace(/'/g, '');
		return str;
	}

}

module.exports = function describeFunction(f) {
	return new FunctionDescriptor(f);
};