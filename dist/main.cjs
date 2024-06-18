'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var acorn = _interopDefault(require('acorn-loose'));

if (!acorn || !acorn.parse) {
	throw new Error('The package \'acorn-loose\' is required to run this library.');
}

const _ACORN_OPTIONS = {ecmaVersion: 2020};

class ParamDescriptor {
	constructor(name, hasDefault, rawName, destructureType=null) {
		this.name = name;
		this.rawName = rawName;
		this.destructureType = destructureType;
		this.hasDefault = hasDefault;
	}
	static fromIdentifierNode(paramNode) {
		// Bare argname.
		return new ParamDescriptor(paramNode.name, false, paramNode.name);
	}
	static fromAssignmentPatternNode(paramNode) {
		// Default arg: arg=val
		const paramIdNode = paramNode.left;
		// TODO: Process paramNode.right (value)
		const paramIdInfo = ParamDescriptor.fromNode(paramIdNode);
		paramIdInfo.hasDefault = true;
		return paramIdInfo;
	}
	static fromArrayPatternNode(paramNode) {
		// Array destructuring. TODO: analyze the expected structure.
		return new ParamDescriptor('', false, paramNode, 'array');
	}
	static fromObjectPatternNode(paramNode) {
		// Object destructuring. TODO: analyze the expected structure.
		return new ParamDescriptor('', false, paramNode, 'object');
	}
	static fromRestElementNode(paramNode) {
		// Spread syntax.
		const identifierInfo = ParamDescriptor.fromNode(paramNode.argument);
		return new ParamDescriptor(identifierInfo.name, false, identifierInfo.rawName, 'spread');
	}
	static fromNode(paramNode) {
		// Because conditional statements aren't error-prone enough.
		const handleNodeFn = ParamDescriptor[`from${paramNode.type}Node`];
		if (handleNodeFn) {
			return handleNodeFn(paramNode);
		} else {
			throw new Error('Unknown parameter type recognized. ' + JSON.stringify(paramNode));
		}
	}
}

class FunctionDescriptor {
	constructor(f) {
		this.f = f;
		this.functionString = FunctionDescriptor.stringify(this.f);
		const anaylsis = FunctionDescriptor.analyzeString(this.functionString, f);
		this.name = anaylsis.name || this.f.name;
		this.isAsync = anaylsis.isAsync;
		this.isArrowFunction = anaylsis.isArrowFunction;
		this.isGenerator = anaylsis.isGenerator;
		this.isClass = anaylsis.isClass;
		this.parameters = anaylsis.parameters;
		this.minArgs = this.f.length;
		this.maxArgs = FunctionDescriptor._getMaxArgs(this.parameters);
	}
	static _extractFunctionNodeAndName(mainNode) {  
		if (['FunctionDeclaration', 'FunctionExpression'].includes(mainNode.type)) {
			return [
				mainNode,
				this._getNameFromIDNode(mainNode.id)
			];
		} else if (mainNode.type == 'ExpressionStatement'
            && mainNode.expression.type == 'ArrowFunctionExpression') {
			return [
				mainNode.expression,
				this._getNameFromIDNode(mainNode.expression.id)
			];
		} else if (mainNode.type == 'ExpressionStatement'
            && mainNode.expression.type == 'CallExpression') {
			// Class methods will be printed like 'methodName(...args) {}' which is 
			// not valid JS on its own. So it it instead a CallExpression followed by
			// a code block ({}). This is why error-tolerant parsing (acorn-loose) is
			// necessary.
			return [
				mainNode.expression,
				this._getNameFromIDNode(mainNode.expression.callee)
			];
		} else {
			throw new Error('Cannot analyze as a function. ' + JSON.stringify(mainNode));
		}
	}
	static analyzeString(functionString, f) {
		if (functionString.replace(/\s/g, '').endsWith('{[nativecode]}')) {
			throw new Error(
				'FunctionDescriptors cannot be created for native functions. '
      + 'Given: ' + functionString);
		} else {
			try {
				const programNode = acorn.parse(functionString, _ACORN_OPTIONS);
				const mainNode = programNode.body[0];
				return this.analyzeMainNode(mainNode, f);
			} catch (e) {
				throw new Error('Unable to parse function. ' + functionString + '. ' + e);
			}
		}
	}
	static _getNameFromIDNode(node) {
		return (node && node.type == 'Identifier') ? node.name : '';
	}
	static _isClass(node) {
		return node.type == 'ClassDeclaration';
	}
	static _analyzeClassNode(classNode, cls) {
		const className = this._getNameFromIDNode(classNode.id);
		const constructorNode = classNode.body.body.find(
			v => v.kind == 'constructor'
		);
		let subAnalysis;
		if (constructorNode) {
			subAnalysis = this.analyzeMainNode(constructorNode.value, undefined);
		} else {
			// Assume the constructor was inherited from a superclass.
			if (classNode.superClass) {
				const superClass = cls.__proto__;
				const superString = this.stringify(superClass);
				subAnalysis = this.analyzeString(superString);
			} else {
				// Must not have a constructor at all, so default to 0-arg.
				subAnalysis = this.analyzeString((function(){}).toString());
			}
		}
		return {...subAnalysis, name: className, isClass: true}; 
	}
	static analyzeMainNode(mainNode, f) {
		if (this._isClass(mainNode)) {
			return this._analyzeClassNode(mainNode, f);
		} else {
			const [funcNode, name] = this._extractFunctionNodeAndName(mainNode);
			const params = funcNode.params || funcNode.arguments || [];
			const parameters = params.map(ParamDescriptor.fromNode);
			return {
				isAsync: !!funcNode.async,
				isArrowFunction: !!funcNode.expression,
				isGenerator: !!funcNode.generator,
				isClass: false,
				name,
				parameters,
			};
		}
	}
	static _getMaxArgs(parameters) {
		const hasSpreadParam = parameters.some(p => p.destructureType == 'spread');
		return hasSpreadParam ? Infinity : parameters.length;
	}

	static stringify(f) {
		// Accounts for Function subclasses with overridden toString().
		const boundToString = Function.prototype.toString.bind(f);
		return boundToString().trim();
	}
}

function describeFunction(f) {
	return new FunctionDescriptor(f);
}

describeFunction.FunctionDescriptor = FunctionDescriptor;
describeFunction.ParamDescriptor = ParamDescriptor;

module.exports = describeFunction;
