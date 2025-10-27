import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from './index.js';

describe('orchestrator test', async () => {
   // @ts-ignore
  const trycatch = async (fn) => { try { return await fn(); } catch (e) { return `${e.name}: ${e.message}`; } };

  test('Hello World, without transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello World',
        fn2: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1'],
        to: ['fn2']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { fn2: 'Hello World' },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, without transition, without to', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello World'
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { connection_0: [['Hello World']] },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, with transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World',
        fn3: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { fn3: 'Hello World' },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, with transition, without to', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World'
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}'
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { connection_0: [['Hello World']] },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, with explicit init', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World',
        fn3: (/** @type {string} */echo)=>echo
      },
      explicitInitsOnly: true
    });
    const runResult = await orchestrator.run({
      inits: {
        fn1: [],
        fn2: []
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { fn3: 'Hello World' },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, with explicit init, with user defined parameters', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: (/** @type {string} */echo)=>echo,
        fn2: (/** @type {string} */echo)=>echo,
        fn3: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      inits: {
        fn1: ['Hello'],
        fn2: ['World']
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { fn3: 'Hello World' },
      variables: { global: {}, locals: [ {} ] }
    });
  });

  test('Hello World, multiple connections', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */echo)=>echo,
        fn2: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      inits: {
        fn1: ['World']
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[ "Hello " & $.from[0] ]]}',
        to: ['fn2']
      }, {
        from: ['fn2']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { connection_1: [[ 'Hello World' ]] },
      variables: { global: {}, locals: [ {}, {} ] }
    });
  });
  
  test('Loop', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        f1: async (/** @type {string} */echo)=>echo,
        f2: async (/** @type {string} */echo)=>echo,
        f3: async (/** @type {string} */echo)=>echo,
        f4: async (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      inits: {
        f1: ['hello'],
        f2: ['world']
      },
      connections: [{
        from: ['f1', 'f2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]], "global":{"y":1}}',
        to: ['f3']
      }, {
        from: ['f3'],
        transition: '($i:=$.local.i; $i:=($i?$i:0)+1; {"global":{"y":($.global.y+1)}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
        to: ['f4', 'f3']
      }]
    });
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { f4: 'hello world 5' },
      variables: { global: { y: 6 }, locals: [ {}, { i: 5 } ] }
    });
  });

  test('functions output include functions and symbols', async () => {
    const sym = Symbol(1);
    const fn = ()=>'Hello World';

    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>({returnedFn:fn, returnedSymbol: sym, returnedArray:[fn, sym, null]}),
        fn2: (/** @type {function} */echoFn, /** @type {symbol} */echoSyn)=>({echoFn: echoFn, echoSyn: echoSyn})
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[ $.from[0].returnedFn, $.from[0].returnedSymbol, {"int": 1} ]]}',
        to: ['fn2']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.results.fn2.echoFn, fn);
    assert.deepStrictEqual(runResult.results.fn2.echoSyn, sym);
  });

  test('Error: wrong transition syntax', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
        fn2: (/** @type {string} */a)=>a
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      inits: {
        fn1: ['Hello']
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0] & " World"]]}}}}}}',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: Connection 0 transition: Syntax error: "}"');
  });

  test('Error: missing from', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      // @ts-ignore
      connections: [{
        transition: '{"to":[["Hello World"]]}',
        to: ['fn1']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: The connection 0 from is an empty array.\nConnection: {"transition":"{\\"to\\":[[\\"Hello World\\"]]}","to":["fn1"]}');
  });
  
  test('Error: wrong "to" type returned by transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      inits: {
        fn1: ['Hello']
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": "Hello World"}',
        to: ['fn1']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: The transition returned value must be an array.\nReturned: "Hello World"\nConnection: {"from":["fn1"],"transition":"{\\"to\\": \\"Hello World\\"}","to":["fn1"]}');
  });

  test('Error: transition return "to" array of different size of "connection.to"', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      inits: {
        fn1: ['Hello']
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": [["Hello World"], [], []]}',
        to: ['fn1'],
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: The transition returned value must be an array of the same length of the connection.to array.\nReturned: [["Hello World"],[],[]]\nConnection: {"from":["fn1"],"transition":"{\\"to\\": [[\\"Hello World\\"], [], []]}","to":["fn1"]}');
  });

  test('Error: explicitInitsOnly set but no inits provided', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      inits: {},
      connections: []
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: When "explicitInitsOnly" is true, "inits" cannot be empty.');
  });

});