import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from './index.js';

describe('orchestrator test', async () => {
  const trycatch = async (/** @type {Function}} */ fn) => { try { return await fn(); } catch (e) { return e; } };

  test('Empty', async () => {
    const orchestrator = new Orchestrator();
    
    const runResult = await orchestrator.run();

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { state: { results: {}, variables: { global: {}, locals: [] } } });
  });

  test('Hello World, without from, without transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>'Hello World'
      }
    });
    const runResult = await orchestrator.run({
      connections: [{
        to: ['fn1']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn1: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
  });

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
      state: {
        results: { fn2: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
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
      state: {
        results: { connection_0: { result: [['Hello World']] } },
        variables: { global: {}, locals: [ {} ] }
      }
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
      state: {
        results: { fn3: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
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
      state: {
        results: { connection_0: { result: [['Hello World']] } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
  });

  test('Hello World, with explicit init', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World',
        fn3: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      functions: {
        fn1: { args: []},
        fn2: { args: []}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn3: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
  });

  test('Hello World, with explicit init, with user defined parameters', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn3: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
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
      functions: {
        fn1: { args: ['World']}
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
      state: {
        results: { connection_1: { result: [[ 'Hello World' ]] } },
        variables: { global: {}, locals: [ {}, {} ] }
      }
    });
  });

  test('Hello World, with input and output transformation', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello'] },
        fn2: { ref: 'echo', 
          inputsTransformation: '[$[0] & " World"]', 
          outputTransformation: '$ & "!"' 
        }
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0]]]}',
        to: ['fn2']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn2: { result: 'Hello World!' } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
  });
  
  test('Loop', async () => {
    /** @type {Array<any>} */
    const stateChangeEvents = [];
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    orchestrator.addEventListener('state.change', e=>stateChangeEvents.push(e));
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'echo'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]], "global":{"y":1}}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '($i:=$.local.i; $i:=($i?$i:0)+1; {"global":{"y":($.global.y+1)}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
        to: ['fn4', 'fn3']
      }]
    });
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn4: { result: 'Hello World 5' } },
        variables: { global: { y: 6 }, locals: [ {}, { i: 5 } ] }
      }
    });
    assert.deepStrictEqual(stateChangeEvents.length, 12);
  });

  test('Parallel execution', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {function} */echo)=>echo
      }
    });
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'echo'},
        fn5: { ref: 'echo'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '{"to":[[ $.from[0] ]]}',
        to: ['fn4']
      }, {
        from: ['fn3'],
        transition: '{"to":[[ $.from[0] ]]}',
        to: ['fn5']
      }]
    });
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { 
      state: {
        results: { fn4: { result: 'Hello World' }, fn5: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {}, {}, {} ] }
      }
    });
  });

  test('Functions output include functions and symbols', async () => {
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
    // @ts-ignore
    assert.deepStrictEqual(runResult.state.results.fn2.result.echoFn, fn);
    // @ts-ignore
    assert.deepStrictEqual(runResult.state.results.fn2.result.echoSyn, sym);
  });

  test('Events listening', async () => {
    /** @type {Object<string, any>} */
    const events = {
      success: '',
      'state.change': [],
      results: []
    };
    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>'Hello World',
        fn2: (/** @type {function} */echo)=>echo
      }
    });
    // @ts-ignore
    orchestrator.addEventListener('success', (e)=>{ events['success'] = e.detail; });
    // @ts-ignore
    orchestrator.addEventListener('state.change', (e)=>{ events['state.change'].push(e.detail); });
    // @ts-ignore
    orchestrator.addEventListener('results', (e)=>{ events['results'].push(e.detail); });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[ $.from[0] ]]}',
        to: ['fn2']
      }]
    });

    //console.dir(events['results'], {depth: null});
    assert.deepStrictEqual(events['success'], {
      state: {
        results: { fn2: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
    assert.deepStrictEqual(events['state.change'].length, 2);
    assert.deepStrictEqual(events['state.change'][1], {
      state: {
        results: { fn2: { result: 'Hello World' } },
        variables: { global: {}, locals: [ {} ] }
      }
    });
    assert.deepStrictEqual(events['results'], [
      { fn1: { result: 'Hello World' } },
      { fn2: { result: 'Hello World' } }
    ]);
    
  });

  test('Function throws false', async () => {
    /** @type {Object<string, any>} */
    const events = {};
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>{ throw new Error('FAIL');},
        fn2: ()=>{ return 'DONE';},
        fn3: async (/** @type {string} */echo)=>echo
      }
    });
    // @ts-ignore
    orchestrator.addEventListener('errors', (e)=>{ events['errors'] = e.detail; });
    // @ts-ignore
    orchestrator.addEventListener('errors.fn1', (e)=>{ events['errors.fn1'] = e.detail; });
    const runResult = await orchestrator.run({
      functions: {
        fn1: { throws: false },
        fn2: { }
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[ $.from[0] ]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    // @ts-ignore
    assert.deepStrictEqual(runResult.state.results.fn1.error.message, 'FAIL');
    assert.deepStrictEqual(events['errors'].fn1.error.message, 'FAIL');
    assert.deepStrictEqual(events['errors.fn1'].error.message, 'FAIL');
  });

  test('Function throws true', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>{ throw 'FAIL';},
        fn2: async (/** @type {string} */echo)=>echo
      }
    });
    
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { args: [], throws: true},
      },
      connections: [{
        from: ['fn1'],
        transition: '{ "to":[[ $.from[0] ]] }',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error, 'FAIL');
  });

  test('Resume execution setting state', async () => {
    /** @type {Array<any>} */
    const stateChangeEvents = [];
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    const state = {
      results: { fn3: { result: 'Hello World' } },
      variables: { global: { y: 5 }, locals: [ {}, { i: 4 } ] }
    };

    orchestrator.addEventListener('state.change', e=>stateChangeEvents.push(e));
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'echo'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]], "global":{"y":1}}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '($i:=$.local.i; $i:=($i?$i:0)+1; {"global":{"y":($.global.y+1)}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
        to: ['fn4', 'fn3']
      }]
    }, {}, state);
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, {
      state: {
        results: { fn4: { result: 'Hello World 5' } },
        variables: { global: { y: 6 }, locals: [ {}, { i: 5 } ] }
      }
    });
    assert.deepStrictEqual(state, {
      results: { fn4: { result: 'Hello World 5' } },
      variables: { global: { y: 6 }, locals: [ {}, { i: 5 } ] }
    });
    assert.deepStrictEqual(runResult.state, state);
    assert.deepStrictEqual(stateChangeEvents.length, 1);
  });


  test('Abort execution', async () => {
    const controller = new AbortController();
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo,
        abort: ()=>controller.abort(new Error('This operation was aborted'))
      }
    });
    
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'abort'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '{"to": [[], [$.from[0]] ]}',
        to: ['fn4', 'fn3']
      }]
    }, { signal: controller.signal }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'This operation was aborted');
  });

  test('Abort pre execution', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    const signal = AbortSignal.timeout(1);
    await new Promise(resolve=>setTimeout(resolve,1));
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'abort'}
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '{"to": [[], [$.from[0]] ]}',
        to: ['fn4', 'fn3']
      }]
    }, { signal }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(typeof runResult.error, 'object');
  });

  test('Errors: constructor', async () => {
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => new Orchestrator(null))).message, 'Invalid type for config. Missing required value');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => new Orchestrator('wrong'))).message, 'Invalid type for config. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => new Orchestrator({ functions: 'wrong' }))).message, 'Invalid type for config.functions. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => new Orchestrator({ functions: { fn: 'wrong'} }))).message, 'Invalid type for config.functions["fn"]. Expected function but provided string: "wrong"');
  });

  test('Errors: run', async () => {
    const orchestrator = new Orchestrator({
      functions: { 
        echo: (/** @type {string} */echo)=>echo,
        timeoutEcho: (/** @type {string} */echo)=>new Promise(resolve=>setTimeout(()=>resolve(echo), 1)),
        hello: ()=>'world'
      }
    });
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run(null, null))).error.message, 'Invalid type for config. Missing required value');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run('wrong', null))).error.message, 'Invalid type for config. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, null))).error.message, 'Invalid type for options. Missing required value');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, 'wrong'))).error.message, 'Invalid type for options. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, null))).error.message, 'Invalid type for state. Missing required value');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, 'wrong'))).error.message, 'Invalid type for state. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: 'wrong'}))).error.message, 'Invalid type for config.functions. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: 'wrong'}))).error.message, 'Invalid type for config.connections. Expected array but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {signal: 'wrong'}))).error.message, 'The provided signal must be an instance of AbortSignal');

    assert.deepStrictEqual((await trycatch(() => (orchestrator.run({ connections: [{from:['timeoutEcho']}]}), orchestrator.run({ connections: [{from:['timeoutEcho']}]})) )).error.message, 'The Orchestration is already running');

    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: ['wrong']}))).error.message, 'Invalid type for connection[0]. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: 'wrong'}]}))).error.message, 'Invalid type for connection[0].from. Expected array but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: [false]}]}))).error.message, 'Invalid type for connection[0].from[0]. Expected string but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['wrong']}]}))).error.message, 'Invalid function name in connection[0].from[0]');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:'wrong'}]}))).error.message, 'Invalid type for connection[0].to. Expected array but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:[false]}]}))).error.message, 'Invalid type for connection[0].to[0]. Expected string but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:['wrong']}]}))).error.message, 'Invalid function name in connection[0].to[0]');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:['echo'], transition: false }]}))).error.message, 'Invalid type for connection[0].transition. Expected string but provided boolean: false');
    
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], transition: '{}}}}' }]}))).error.message, 'Connection 0 transition: Syntax error: "}"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], transition: '{ "global": false }' }]}))).error.message, 'Invalid type of global variable returned by the transition of connection 0. Expected object but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], transition: '{ "local": false }' }]}))).error.message, 'Invalid type of local variable returned by the transition of connection 0. Expected object but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:['echo'], transition: '{ "to":"wrong" }' }]}))).error.message, 'Invalid type of "to" value returned by the transition of connection 0. Expected array but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:['echo'], transition: '{ "to":[] }' }]}))).error.message, 'The connection 0 transition returned "to" value must be an array of the same length of the "connection.to" array (length=1).\nReturned: [] (length=0)');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ connections: [{from: ['hello'], to:['echo'], transition: '{ "to":["wrong"] }' }]}))).error.message, 'Invalid type of "to[0]" value returned by the transition of connection 0. Expected array but provided string: "wrong"');

    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: 'wrong'}}))).error.message, 'Invalid type for functions["fn"]. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {args:'wrong'}}}))).error.message, 'Invalid type for functions["fn"].args. Expected array but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {ref:false}}}))).error.message, 'Invalid type for functions["fn"].ref. Expected string but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {throws:'wrong'}}}))).error.message, 'Invalid type for functions["fn"].throws. Expected boolean but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {inputsTransformation:false}}}))).error.message, 'Invalid type for functions["fn"].inputsTransformation. Expected string but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {outputTransformation:false}}}))).error.message, 'Invalid type for functions["fn"].outputTransformation. Expected string but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {ref:'wrong'}}}))).error.message, 'Function fn not valid. The provided ref do not point to a valid function');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {fn: {}}}))).error.message, 'Function fn not valid. The parameter ref is not provided and the function name do not match any valid function');
  
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {echo: {inputsTransformation: '{}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo inputsTransformation: Invalid type returned. Expected array but provided object: {}');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {echo: {inputsTransformation: '{}}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo inputsTransformation: Syntax error: "}"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({ functions: {echo: {outputTransformation: '{}}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo outputTransformation: Syntax error: "}"');

    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {}))).error.message, 'Invalid type for state.results. Missing required value');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { results: 'wrong'}))).error.message, 'Invalid type for state.results. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { results: { fn: 'wrong'}}))).error.message, 'Invalid type for state.results["fn"]. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { results: { fn: {}}}))).error.message, 'Invalid content for state.results["fn"]. Expected "result" or "error"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { results: { fn: { result:{}}}}))).error.message, 'The function fn in state.results do not exist');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { variables:'wrong', results: { hello: {result:{}}}}))).error.message, 'Invalid type for state.variables. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { variables:{global:'wrong'}, results: { hello: {result:{}}}}))).error.message, 'Invalid type for state.variables.global. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { variables:{global:{}, locals:'wrong'}, results: { hello: {result:{}}}}))).error.message, 'Invalid type for state.variables.locals. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { variables:{global:{}, locals:['wrong']}, results: { hello: {result:{}}}}))).error.message, 'Invalid type for state.variables.locals[0]. Expected object but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, { variables:{global:{}, locals:[{}]}, results: { hello: {result:{}}}}))).error.message, 'Invalid length for array state.variables.locals. Expected 0 but provided 1');

  });
  
});