import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from './index.js';

describe('orchestrator test', async () => {
  const trycatch = async (/** @type {Function}} */ fn) => { try { return await fn(); } catch (e) { return e; } };

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

    console.dir(runResult, {depth: null});
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
      },
      explicitInitsOnly: true
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
      },
      explicitInitsOnly: true
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
        fn2: { args: [] }
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

  test('Resume execution using setState', async () => {
    /** @type {Array<any>} */
    const stateChangeEvents = [];
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    orchestrator.addEventListener('state.change', e=>stateChangeEvents.push(e));
    orchestrator.setState({
      results: { fn3: { result: 'Hello World' } },
      variables: { global: { y: 5 }, locals: [ {}, { i: 4 } ] }
    });
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
    assert.deepStrictEqual(stateChangeEvents.length, 1);
  });

  test('Error: wrong transition syntax', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
        fn2: (/** @type {string} */a)=>a
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { args: ['Hello']},
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0] & " World"]]}}}}}}',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Connection 0 transition: Syntax error: "}"');
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
    assert.deepStrictEqual(runResult.error.message, 'The connection 0 from is an empty array.');
  });
  
  test('Error: wrong "to" type returned by transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { args: ['Hello']},
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": "Hello World"}',
        to: ['fn1']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'The connection 0 transition returned "to" value must be an array.\nReturned: "Hello World".');
  });

  test('Error: transition return "to" array of different size of "connection.to"', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { args: ['Hello']},
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": [["Hello World"], [], []]}',
        to: ['fn1'],
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'The connection 0 transition returned "to" value must be an array of the same length of the "connection.to" array (length=1).\nReturned: [["Hello World"],[],[]] (length=3).');
  });

  test('Error: transition return "to" array containing non array', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      }
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { args: ['Hello']},
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": ["Hello World"]}',
        to: ['fn1'],
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'The connection 0 transition returned "to" array value must contains only arrays of input parameters.\nReturned: "Hello World".');
  });

  test('Error: explicitInitsOnly set but no args provided', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      connections: []
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'When "explicitInitsOnly" is true, args must be provided to some functions.');
  });

  test('Error: function not existing', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn2: { args: []},
      },
      connections: []
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Function fn2 not valid. The parameter ref is not provided and the function name do not match any valid function.');
  });

  test('Error: args not array', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */a)=>a,
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        // @ts-ignore
        fn1: { args: 'Hello'},
      },
      connections: []
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Invalid type for functions["fn1"].args. Expected array but provided string: Hello');
  });

  test('Error: inputsTransformation return not array', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello'] },
        fn2: { ref: 'echo', 
          inputsTransformation: '$[0] & " World"'
        }
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0]]]}',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Function fn2 inputsTransformation: The function fn2 inputsTransformation return value must be an array.\nReturned: "Hello World"');
  });

  test('Error: inputsTransformation wrong jsonata', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello'] },
        fn2: { ref: 'echo', 
          inputsTransformation: '{$[0]}}'
        }
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0]]]}',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Function fn2 inputsTransformation: Expected ":", got "}"');
  });

  test('Error: outputTransformation wrong jsonata', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      },
      explicitInitsOnly: true
    });
    const runResult = await trycatch(async () => orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello'] },
        fn2: { ref: 'echo', 
          outputTransformation: '{$[0]}}'
        }
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[$.from[0]]]}',
        to: ['fn2']
      }]
    }));

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Function fn2 outputTransformation: Expected ":", got "}"');
  });

});