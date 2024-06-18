# Javascript `FunctionDescriptor`s

Fast, foolproof library to describe a Javascript function, including its parameter names and traits.

This library uses [`acorn`](https://github.com/acornjs/acorn/tree/master) to parse the stringified function, then traverses the syntax tree. Because it doesn't rely on Regex, it is much less brittle than other libraries.

```js
const describeFunction = require('function-descriptor')

const fn = (a, b=1) => a + b
const descriptor = describeFunction(fn)

console.log(descriptor.name)  // "fn"
console.log(descriptor.isArrowFunction)  // true
console.log(descriptor.parameters[0].name)  // "a"
console.log(descriptor.parameters[1].name)  // "b"
console.log(descriptor.parameters[1].hasDefault)  // true
```

## Installation
Within a Node.js project, install through [npm](https://www.npmjs.com/package/function-descriptor).
```bash
npm install function-descriptor
```
Or, to use on the web, add:
```html
<!-- Dependency: 'acorn-loose' library. --> 
<script src="https://cdnjs.cloudflare.com/ajax/libs/acorn-loose/8.4.0/acorn-loose.min.js" integrity="sha512-Ffb86Jr5RrEScAcI3I/LQ8Tr/VM6C/I79Icryx8X4cpiBIvdPNKqf2MbXdlpFj61+gCPTWWQkwOw9m/7CHed3A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<!-- This library. -->
<script type="application/javascript" src="https://unpkg.com/function-descriptor/dist/main.umd.js"></script>
```
Or, poke around the `dist` folder.

## Features
Information you can glean from a function using this library:
- Minimum number of arguments (`minArgs`)
- Maximum number of arguments (`maxArgs`)
- Whether it is:
  - An arrow function (`isArrowFunction`)
  - An async function (`isAsyncFunction`)
  - A generator function (`isGenerator`)
  - A class (`isClass`). In this case, the returned `FunctionDescriptor` will describe the constructor.
- Parameter traits (`parameters`)
  - Parameter name (`name`)
  - Whether there is a default value (`hasDefault`)
  - If parameters/arguments are not a 1-1 mapping (`destructureType`). For example:
    - `...args` Spread syntax (`destructureType = "spread"`)
    - `{ arg1, arg2 }` Object destructuring (`destructureType = "object"`)
    - `[elem1, elem2]` Array destructuring (`destructureType = "array"`)

This library supports a number of features including:
- Anonymous functions
- Spread syntax
- Object and array destructuring
- Detecting if a parameter has a default value set
- Class / instance methods
- Arbitrary strings and comments within the signature, such as the following:
```js
function(myarg="Let's try to break the parser: , myotherarg,\",)\n\n[...args]function(){}{") {
  // Definition
}
```

## Complex Example

Here's an arbitrary Javascript function one might write, using some extended JS concepts when defining the parameter definitions.
```js
function f(x, y=1, { operation, printArgs }, ...args) {
  if (printArgs) {
    console.log("Given extra arguments: " + args)
  }
  if (operation == "add") {
    return x + y
  } else {
    return x - y
  }
}
console.log(describeFunction(f))
```

```js
FunctionDescriptor {
  f: [Function: f],
  name: 'f',
  isAsync: false,
  isClass: false,
  isGenerator: false,
  parameters: [
    ParamDescriptor {
      name: 'x',
      rawName: 'x',
      destructureType: null,
      hasDefault: false
    },
    ParamDescriptor {
      name: 'y',
      rawName: ...,
      destructureType: null,
      hasDefault: true
    },
    ParamDescriptor {
      name: undefined,
      rawName: ...,
      destructureType: 'object',
      hasDefault: false
    },
    ParamDescriptor {
      name: 'args',
      rawName: ...,
      destructureType: 'spread',
      hasDefault: false
    }
  ],
  minArgs: 1,
  maxArgs: Infinity,
  functionString: ...,
  isArrowFunction: false
}
```

Some things to note:
- Arguments formed by object or array destructuring do not have names.
- When a parameter uses spread syntax, the maximum number of arguments becomes `Infinity`.
- When there are defaults, the actual values are **not** detected (it would be possible to parse these values if they were literals, but that's not implemented).
