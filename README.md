# Javascript FunctionDescriptors

The *even better* (subjectively) library to describe a Javascript function, including its parameter names and traits.

This is essentially a wrapper around the parsing logic from [`get-param-names`](https://github.com/theLAZYmd/get-param-names), refactored and slightly modified to fix some bugs.

```js
const fn = (a, b=1) => a + b
const descriptor = describeFunction(fn)

console.log(descriptor.name)  // "fn"
console.log(descriptor.isArrowFunction)  // true
console.log(descriptor.parameters[0].name)  // "a"
console.log(descriptor.parameters[1].name)  // "b"
console.log(descriptor.parameters[1].hasDefault)  // true
```

Information you can glean from a function using this library:
- Minimum number of arguments (`minArgs`)
- Maximum number of arguments (`maxArgs`)
- Whether it is an arrow function (`isArrowFunction`)
- Whether it is async (`isAsync`)
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
- Comment within the signature

> [!CAUTION]
> There are a number of tests verifying these extended features. However, the library is based on RegEx parsing and may therefore still be brittle.

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
  parameters: [
    ParamDescriptor {
      name: 'x',
      rawName: 'x',
      destructureType: null,
      hasDefault: false
    },
    ParamDescriptor {
      name: 'y',
      rawName: 'y',
      destructureType: null,
      hasDefault: true
    },
    ParamDescriptor {
      name: undefined,
      rawName: { operation: undefined, printArgs: undefined },
      destructureType: 'object',
      hasDefault: false
    },
    ParamDescriptor {
      name: 'args',
      rawName: '...args',
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
- Arguments formed by object or array destructuring do not have names, but their original value can be accessed through the `rawName` parameter.
- When a parameter uses spread syntax, the maximum number of arguments becomes `Infinity`.
- When there are defaults, the actual values are **not** detected (it would be possible to parse these values if they were literals, but that's not implemented).
