import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from './index.js';

describe('orchestrator test', async () => {
   // @ts-ignore
  const trycatch = async (fn) => { try { return await fn(); } catch (e) { return `${e.name}: ${e.message}`; } };

  test('run generic 1', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
        fn2: (/** @type {string} */a)=>a
      }
    });
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

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { fn2: 'Hello World' },
      variables: { global: {}, locals: [ {} ] }
    });
  });
  
  test('run generic 2', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
        fn2: (/** @type {string} */a)=>a
      }
    });
    const runResult = await orchestrator.run({
      inits: {
        fn1: ['Hello']
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0] & " World"]]}',
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
  
  test('run loop', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        f1: async (/** @type {string} */a)=>a,
        f2: async (/** @type {string} */a)=>a,
        f3: async (/** @type {string} */a)=>a,
        f4: async (/** @type {string} */a)=>a
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
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      results: { f4: 'hello world 5' },
      variables: { global: { t: 1 }, locals: [ {}, { i: 5 } ] }
    });
  });

  test('run error 1', async () => {
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

  test('run error 2', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      connections: [{
        transition: '{"to":[["Hello World"]]}',
        to: ['fn1']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, 'Error: The connection 0 from is an empty array.\nConnection: {"transition":"{\\"to\\":[[\\"Hello World\\"]]}","to":["fn1"]}');
  });
  
  test('run error 3', async () => {
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

  test('run error 4', async () => {
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

});