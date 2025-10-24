# Isomorphic orchestrator for JS functions

This library provide a simple yet powerful, fast, secure, and extensible orchestrator for your JS functions, working in browsers and NodeJS/Bun/Deno.
The orchestration logic is defined in a simple JSON and use the power of [JSONata](https://jsonata.org/) for input/output transformation.

## Usage

### NodeJS

```sh
npm install js-functions-orchestrator
```

```js
import { Orchestrator } from 'js-functions-orchestrator';

const orchestrator = new Orchestrator({
  functions: {
    fn1: async a=>a, //async echo function
    fn2: a=>a        //simple echo function
  }
});
const runResult = await orchestrator.run({
  inits: {
    fn1: ['Hello']  //initial input parameters for fn1
  },
  connections: [{
    from: ['fn1'],
    transition: '{"to":[[$.from[0] & " World"]]}', //the result of fn1 (the string "Hello") is combined with the string " World" and used as input for fn2
    to: ['fn2']
  }]
});
console.log(runResult);
/* output:
{
  results: { fn2: 'Hello World' },
  variables: { global: {}, locals: [ {} ] }
}
*/
```

More complex scenario with a loop:

```js
import { Orchestrator } from 'js-functions-orchestrator';

const orchestrator = new Orchestrator({
  functions: {
    f1: async a=>a,
    f2: async a=>a,
    f3: async a=>a,
    f4: async a=>a
  }
});

const runResult = await orchestrator.run({
  inits: {
    f1: ['hello'],
    f2: ['world']
  },
  connections: [{
    from: ['f1', 'f2'],
    transition: '{"to": [[$.from[0] & " " & $.from[1]]]}',
    to: ['f3']
  }, {
    from: ['f3'],
    transition: '($i:=$.local.i; $i:=($i?$i:0)+1; $y:=$.global.t; {"global":{"t":1}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
    to: ['f4', 'f3']
  }]
});
console.log(runResult);
/* output:
{
  results: { f4: 'hello world 5' },
  variables: { global: { t: 1 }, locals: [ {}, { i: 5 } ] }
}
*/
```

### Browser

```html
<html>
<script type="module">
import { Orchestrator } from 'https://unpkg.com/js-functions-orchestrator/index.min.js';

const runResult = await orchestrator.run({
  inits: {
    fn1: ['Hello']
  },
  connections: [{
    from: ['fn1'],
    transition: '{"to":[[$.from[0] & " World"]]}',
    to: ['fn2']
  }]
});

console.log(runResult);
/* output:
{
  results: { fn2: 'Hello World' },
  variables: { global: {}, locals: [ {} ] }
}
*/
</script>
</html>
```

## Logic

The orchestration graph is defined only through a list of `connections` between JS functions. A single connection can be `from` multiple JS functions `to` multiple JS functions and may include the transformation logic for the outputs of the `from` JS functions to the inputs of the `to` JS functions. The connection start only when all the `from` JS functions have inputs and, once executed, their results are provided to the transformation logic. The results of the transformation are the inputs for the different `to` JS functions.

In more details the orchestration logic is the following:

1. Initialization of functions

2. Initialization of initial inputs for selected functions
    1. The selected functions are executed and their results stored

3. Loop all connections

4. If there are available results for every `"from"` function, the connection start
    1. Execute the transition
        - JSONata returning `{"to":[…]}`
        - Available `$.from` array, `$.global` object, and `$.local` object
    2. Store transition results as inputs for all the `"to"` functions
    3. Delete all the `"from"` results
    4. Execute all the `"to"` functions with the available inputs from the transition
        - If input is `"null"` the function is not executed (loop exit condition)
        - Execution is async. Await only when connection start

5. Do until no more connections can start
    - Note: incorrectly designed graphs can lead to infinite executions.

6. Return all the remaining connections results


## Syntax

```json
{
    "init": {               // Functions with user defined inputs. This functions will start the orchestration.
        "fn1": ["Hello"]    // Key is the identifier of the function, value is the array of expected parameters.
    },
    "connections": [{       // List of existing connections between functions (order is not important). The orchestrator will loop the connections untill no one can start.
        "from": ["fn1"],    // A connection require a non empty "from" array, containing the identifier of the functions that origin the connection. The connection start only when all the functions in the "from" have an array of parameter defined (or from "init" or from results of another connection). In this case all the "from" functions are executed, and their results are available in the JSONata of the "transition".
        "transition": "{\"to\":[[$.from[0] & \" World\"]]}", //JSONata expression that must return at least the JSON { "to": [] }. "to" must be an array of the same size of the "connection.to" array, containing an array of input parameters for the relative "connection.to function". Additionally it can return "global", and "local", to store respectively globally and locally scoped variables (a global variable is visible in all the connection transition, while a local variable only in the same transition but across multiple execution). If the transition is not provided the output of the "from" functions are provided directly as inputs to the "to" functions. In such case "from" and "to" array must be of the same size.
        "to": ["fn2"]       // List of functions that can consume the output of the "transition" as their inputs. The functions are executed and next connection is checked until no more connections can start. 
    }]
}
```