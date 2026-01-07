import { describe, test } from 'node:test';
import assert from 'node:assert';
import { Orchestrator } from './index.js';

describe('orchestrator test', async () => {
  const trycatch = async (/** @type {Function}} */ fn) => { try { return await fn(); } catch (e) { return e; } };

  test('Empty', async () => {
    const orchestrator = new Orchestrator();
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run();

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult, { state: { variables: { global: {}, locals: [] }, finals: { connections: [], events: {}, functions: {}}, errors: {}, waitings: [], runnings:[], receiveds:{} } });
  });

  test('Hello World, without from, without transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>'Hello World'
      }
    });
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      connections: [{
        to: ['fn1']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn1[0], 'Hello World');
  });

  test('Hello World, without transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello World',
        fn2: (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1'],
        to: ['fn2']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn2[0], 'Hello World');
  });

  test('Hello World, without transition, without to', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello World'
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.connections?.[0]?.[0], [['Hello World']]);
  });

  test('Hello World, with transition', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World',
        fn3: (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":[[$.from[0] & " " & $.from[1]]]}',
        to: ['fn3']
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn3[0], 'Hello World');
  });

  test('Hello World, with transition, without to', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async ()=>'Hello',
        fn2: async ()=>'World'
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to":$.from[0] & " " & $.from[1]}'
      }]
    });

    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.connections?.[0]?.[0], 'Hello World');
  });

  test('Hello World, with explicit init, with user defined parameters', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
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
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn3[0], 'Hello World');
  });

  test('Hello World, multiple connections', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        fn1: async (/** @type {string} */echo)=>echo,
        fn2: (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
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
    assert.deepStrictEqual(runResult.state.finals?.connections?.[1]?.[0], [['Hello World']]);
  });

  test('Hello World, with input and output transformation', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
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
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn2[0], 'Hello World!');
  });
  
  test('Loop', async () => {
    /** @type {Array<any>} */
    const stateChangeEvents = [];
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    orchestrator.addEventListener('state.change', e=>stateChangeEvents.push(structuredClone(/** @type {CustomEvent<any>} */(e).detail)));
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
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn4.at(-1), 'Hello World 5');
    assert.deepStrictEqual(runResult.state.variables?.global?.y, 6);
    assert.deepStrictEqual(runResult.state.variables?.locals?.[1].i, 5);
    //assert.deepStrictEqual(stateChangeEvents.length, 12);
  });

  test('Parallel execution', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: (/** @type {function} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
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
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn4[0], 'Hello World');
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn5[0], 'Hello World');
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
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn2[0].echoFn, fn);
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn2[0].echoSyn, sym);
  });

  test('Events listening', async () => {
    /** @type {Object<string, any>} */
    const events = {
      success: '',
      'state.change': [],
      functions: []
    };
    const orchestrator = new Orchestrator({
      functions: {
        fn1: ()=>'Hello World',
        fn2: (/** @type {function} */echo)=>echo
      }
    });
    
    orchestrator.addEventListener('success', (e)=>{ events['success'] = /** @type {CustomEvent<any>} */(e).detail; });
    orchestrator.addEventListener('state.change', (e)=>{ events['state.change'].push(structuredClone(/** @type {CustomEvent<any>} */(e).detail)); });
    orchestrator.addEventListener('functions', (e)=>{ events['functions'].push(/** @type {CustomEvent<any>} */(e).detail); });
    const runResult = await orchestrator.run({
      connections: [{
        from: ['fn1'],
        transition: '{"to":[[ $.from[0] ]]}',
        to: ['fn2']
      }]
    });

    //console.dir(events['results'], {depth: null});
    assert.deepStrictEqual(events['success'].state.finals?.functions?.fn2[0], 'Hello World');

    //assert.deepStrictEqual(events['state.change'].length, 2);
    //assert.deepStrictEqual(events['state.change'][0].state.finals?.functions?.fn1[0], 'Hello World');
    //assert.deepStrictEqual(events['state.change'][1].state.finals?.functions?.fn2[0], 'Hello World');
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn2[0], 'Hello World');
    assert.deepStrictEqual(events['functions'][0].fn1, 'Hello World');
    assert.deepStrictEqual(events['functions'][1].fn2, 'Hello World');
    
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
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

    orchestrator.addEventListener('errors', (e)=>{ events['errors'] = /** @type {CustomEvent<any>} */(e).detail; });
    orchestrator.addEventListener('errors.fn1', (e)=>{ events['errors.fn1'] = /** @type {CustomEvent<any>} */(e).detail; });
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
    
    assert.deepStrictEqual(runResult.state.errors?.fn1[0].message, 'FAIL');
    assert.deepStrictEqual(events['errors'].fn1.message, 'FAIL');
    assert.deepStrictEqual(events['errors.fn1'].message, 'FAIL');
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
    assert.deepStrictEqual(runResult.error.message, 'fn1: FAIL');
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
      waitings: [ /** @type {Record<string, any[]>} */({}), { 'events.ev1': [ 'test' ] } ],
      variables: { global: { y: 5 }, locals: [ {}, {i:4} ] },
      finals: {
        connections: [,,],
        events: {},
        functions: { fn3: [ 'Hello World' ] }
      },
      errors: {},
      runnings: [ { id: 'fn3', inputs: ['Hello World']} ]
    };

    orchestrator.addEventListener('state.change', e=>stateChangeEvents.push(structuredClone(/** @type {CustomEvent<any>} */(e).detail)));
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runResult = await orchestrator.run({
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'echo'}
      },
      events: {
        ev1: { once: true }
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]], "global":{"y":1}}',
        to: ['fn3']
      }, {
        from: ['fn3', 'ev1'],
        transition: '($i:=$.local.i; $i:=($i?$i:0)+1; {"global":{"y":($.global.y+1)}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
        to: ['fn4', 'fn3']
      }]
    }, {}, state);
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.functions?.fn4.at(-1), 'Hello World 5');
    assert.deepStrictEqual(runResult.state.variables?.global?.y, 6);
    assert.deepStrictEqual(runResult.state.variables?.locals?.[1].i, 5);
    assert.deepStrictEqual(runResult.state, state);
    //assert.deepStrictEqual(stateChangeEvents.length, 1);
  });

  test('Resume execution from state.change', async () => {
    /** @type {Array<any>} */
    const stateChanges = [];
    const orchestratorConfig = {
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    };
    const orchestrator = new Orchestrator(orchestratorConfig);

    orchestrator.addEventListener('state.change', e=>stateChanges.push(structuredClone(/** @type {CustomEvent<any>} */(e).detail.state)));
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));
    const runConfig = {
      functions: {
        fn1: { ref: 'echo', args: ['Hello']},
        fn2: { ref: 'echo', args: ['World']},
        fn3: { ref: 'echo'},
        fn4: { ref: 'echo'},
        fn5: { ref: 'echo'}
      },
      events: {
        ev1: { once: true }
      },
      connections: [{
        from: ['fn1', 'fn2'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]]], "global":{"y":1}}',
        to: ['fn3']
      }, {
        from: ['fn3'],
        transition: '{"to": [[$.from[0]]]}',
        to: ['fn5']
      }, {
        from: ['fn3'],
        transition: '($i:=$.local.i; $i:=($i?$i:0)+1; {"global":{"y":($.global.y+1)}, "local":{"i":$i}, "to": [[$.from[0] & " " & $string($i)], $i<5?[[$.from[0]]]:null]})',
        to: ['fn4', 'fn3']
      }]
    };
    const runRes = await orchestrator.run(runConfig);
    //console.dir(runRes, {depth: null});

    for (const state of stateChanges) {
      //console.dir(state, {depth: null});
      const newOrchestrator = new Orchestrator(orchestratorConfig);
      const runResult = await trycatch(async () => await newOrchestrator.run(runConfig, {}, state));
      //console.dir(runResult, {depth: null});
      assert.deepStrictEqual(runResult.state.finals?.functions?.fn4.at(-1), 'Hello World 5');
      assert.deepStrictEqual(runResult.state.finals?.functions?.fn5.at(-1), 'Hello World');
      assert.deepStrictEqual(runResult.state.variables?.global?.y, 6);
      assert.deepStrictEqual(runResult.state.variables?.locals?.[2].i, 5);
      assert.deepStrictEqual(runResult.state, state);
    }
    
    assert.deepStrictEqual(stateChanges.length, 11);
  });

  test('Resume execution from state.change Events only once', async () => {
    const orchestrator = new Orchestrator();
    
    /** @type {Object<string, any>} */
    const events = {};
    /** @type {Array<any>} */
    const stateChanges = [];
    orchestrator.addEventListener('state.change', e=>stateChanges.push(structuredClone(/** @type {CustomEvent<any>} */(e).detail.state)));

    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

    orchestrator.addEventListener('my.event', event=>events['my.event'] = /** @type {CustomEvent<any>} */(event).detail);
    const runConfig = {
      events: {
        ev1: { once: true },
        ev2: { once: true },
        ev3: { ref: 'test'},
        ev4: { ref: 'my.event' }
      },
      connections: [{
        from: ['ev1'],
        transition: '{"to": [$.from[0]]}',
        to: ['ev3']
      }, {
        from: ['ev3', 'ev2'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev4']
      }]
    };
    const runAwait = orchestrator.run(runConfig);
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'Hello'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev2', {detail:'World'}));
    const runResult = await runAwait;

    //console.dir(events, {depth: null});
    assert.deepStrictEqual(events['my.event'], 'Hello World');
    assert.deepStrictEqual(runResult.state.finals?.events?.ev4[0], 'Hello World');

    for (const state of stateChanges) {
      //console.dir(state, {depth: null});
      const newOrchestrator = new Orchestrator();
      //newOrchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

      //newOrchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
      const runAwait = newOrchestrator.run(runConfig, {}, state);
      await new Promise(resolve=>setTimeout(resolve,1));
      if (!state.receiveds.ev1)
        newOrchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'Hello'}));
      await new Promise(resolve=>setTimeout(resolve,1));
      if (!state.receiveds.ev2)
        newOrchestrator.dispatchEvent(new CustomEvent('ev2', {detail:'World'}));
      const runResult = await trycatch(async () => await runAwait);
      assert.deepStrictEqual(runResult.state.finals?.events?.ev4[0], 'Hello World');
    }
  });

  test('User defined Events only once', async () => {
    const orchestrator = new Orchestrator();
    const state = {};
    /** @type {Object<string, any>} */
    const events = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    orchestrator.addEventListener('my.event', event=>events['my.event'] = /** @type {CustomEvent<any>} */(event).detail);
    const runAwait = orchestrator.run({
      events: {
        ev1: { once: true },
        ev2: { once: true },
        ev3: { ref: 'my.event' }
      },
      connections: [{
        from: ['ev1', 'ev2'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev3']
      }]
    }, {}, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'Hello'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev2', {detail:'World'}));
    const runResult = await runAwait;
    
    //console.dir(events, {depth: null});
    assert.deepStrictEqual(events, {
      'my.event': 'Hello World'
    });
    assert.deepStrictEqual(runResult.state.finals?.events?.ev3[0], 'Hello World');
    assert.deepStrictEqual(runResult.state, state);
  });

  test('User defined Events no once', async () => {
    const orchestrator = new Orchestrator();
    const controller = new AbortController();
    const state = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runAwait = orchestrator.run({
      //events: {
        //ev1: {},
        //ev2: {},
        //ev3: {}
      //},
      connections: [{
        from: ['ev1', 'ev2'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev3']
      }]
    }, { signal: controller.signal }, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    //orchestrator.addEventListener('ev3', event=>console.log(event));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'Hello'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev2', {detail:'World'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    controller.abort(new Error('Required manual abort'));
    const runResult = await trycatch(async () => await runAwait);
    
    //console.dir(runResult, {depth: null});
    //console.dir(state, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Required manual abort');
    assert.deepStrictEqual(runResult.state, state);
    assert.deepStrictEqual(runResult.state.finals?.events?.ev3[0], 'Hello World');
  });

  test('User defined Events mixed functions with once', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    const state = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runAwait = orchestrator.run({
      functions: {
        fn1: { args: ['Hello'], ref: 'echo' }
      },
      events: {
        ev1: { once: true },
        //ev2: {}
      },
      connections: [{
        from: ['fn1', 'ev1'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev2']
      }]
    }, {}, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    //orchestrator.addEventListener('ev2', event=>console.log(event));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'World'}));
    const runResult = await runAwait;
    
    //console.dir(state, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.events?.ev2[0], 'Hello World');
  });

  test('User defined Events mixed functions without once manual abort', async () => {
    const controller = new AbortController();
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    const state = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

    const runAwait = orchestrator.run({
      functions: {
        fn1: { args: ['Hello'], ref: 'echo' }
      },
      //events: {
      //  ev1: {}
      //},
      connections: [{
        from: ['fn1', 'ev1'],
        transition: '{"to": [[$.from[0] & " " & $.from[1]], [$.from[0] & " " & $.from[1]]]}',
        to: ['fn1', 'echo']
      }]
    }, { signal: controller.signal }, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'World'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'!'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    controller.abort(new Error('Required manual abort'));
    const runResult = await trycatch(async () => await runAwait);
    
    //console.dir(runResult, {depth: null});
    //console.dir(state, {depth: null});
    assert.deepStrictEqual(runResult.error.message, 'Required manual abort');
    assert.deepStrictEqual(runResult.state, state);
    assert.deepStrictEqual(runResult.state.finals?.functions?.echo[1], 'Hello World !');
  });

  test('Deadlock detection: Once event consumed but connection not ready', async () => {
    const orchestrator = new Orchestrator();    
    const runAwait = orchestrator.run({
      events: {
        ev1: { once: true },
        ev2: { ref: 'target' }
      },
      connections: [{
        from: ['ev1', 'ev1'],
        transition: '{"to": [$.from[0]]}',
        to: ['ev2']
      }]
    });
    await new Promise(resolve => setTimeout(resolve, 1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', { detail: 'one' }));
    const runResult = await runAwait;

    assert.strictEqual(runResult.state.finals?.events?.ev2, undefined);
    assert.strictEqual(runResult.state.waitings?.[0]['events.ev1'].length, 1);
    assert.strictEqual(runResult.state.waitings?.[0]['events.ev1'][0], 'one');
  });

  test('Bugfix: User defined Events mixed functions without once auto abort (overwriting events)', async () => {
    const controller = new AbortController();
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>new Promise(resolve=>setTimeout(()=>resolve(echo), 100))
      }
    });
    const state = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runAwait = orchestrator.run({
      functions: {
        fn1: { args: ['Hello'], ref: 'echo' }
      },
      events: {
        ev1: { once: false }
      },
      connections: [{
        from: ['fn1', 'ev1'],
        transition: '($i:=($.local.i?$.local.i:0)+1; {"local":{"i":$i}, "to": [$i<2?[[$.from[0] & " " & $.from[1] ]]:null, [$.from[0] & " " & $.from[1]]]})',
        to: ['fn1', 'echo']
      }]
    }, { signal: controller.signal }, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'World'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'!'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    //No manual abort required in this case as it automatically detect that the execution can not continue
    //controller.abort(new Error('Required manual abort'));
    
    const runResult = await trycatch(async () => await runAwait);
    
    //console.dir(runResult, {depth: null});
    //console.dir(state, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.functions?.echo[1], 'Hello World !');
    assert.deepStrictEqual(runResult.state.variables.locals[0].i, 2);
  });

  test('User defined Events mixed functions without once auto abort', async () => {
    const orchestrator = new Orchestrator({
      functions: {
        echo: async (/** @type {string} */echo)=>echo
      }
    });
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} /(e).detail, {depth: null}));
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

    const runAwait = orchestrator.run({
      functions: {
        fn1: { args: ['Hello'], ref: 'echo' }
      },
      connections: [{
        from: ['fn1'],
        transition: '{"to": [null]}',
        to: ['echo']
      }, {
        from: ['echo', 'ev1'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev2']
      }]
    });
    await new Promise(resolve=>setTimeout(resolve,1));
    //orchestrator.addEventListener('ev2', event=>console.log(event));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'World'}));
    const runResult = await runAwait;
    
    //console.dir(runResult, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.events, {});
  });

  test('Bugfix: connection with same multiple from', async () => {
    const orchestrator = new Orchestrator();
    const controller = new AbortController();
    const state = {};
    //orchestrator.addEventListener('state.change', e=>console.dir(/** @type {CustomEvent<any>} */(e).detail, {depth: null}));
    const runAwait = orchestrator.run({
      //events: {
      //  ev1: {},
      //  ev2: {}
      //},
      connections: [{
        from: ['ev1', 'ev1'],
        transition: '{"to": [$.from[0] & " " & $.from[1]]}',
        to: ['ev2']
      }]
    }, { signal: controller.signal }, state);
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'Hello'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    orchestrator.dispatchEvent(new CustomEvent('ev1', {detail:'World'}));
    await new Promise(resolve=>setTimeout(resolve,1));
    controller.abort(new Error('Required manual abort'));
    const runResult = await trycatch(async () => await runAwait);
    
    //console.dir(runResult, {depth: null});
    //console.dir(state, {depth: null});
    assert.deepStrictEqual(runResult.state.finals?.events?.ev2[0], 'Hello World');
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
    //orchestrator.addEventListener('logs', e=>console.log('(%i) %s: %o', /** @type {CustomEvent<any>} */(e).detail.level, /** @type {CustomEvent<any>} */(e).detail.type, /** @type {CustomEvent<any>} */(e).detail.message));

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
    assert.deepStrictEqual((await trycatch(() => new Orchestrator({ functions: 'wrong' }))).message, 'Invalid type for config.functions. Expected object or undefined but provided string: "wrong"');
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
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: 'wrong'}))).error.message, 'Invalid type for config.functions. Expected object or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: 'wrong'}))).error.message, 'Invalid type for config.events. Expected object or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: 'wrong'}))).error.message, 'Invalid type for config.connections. Expected array or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {signal: 'wrong'}))).error.message, 'The provided signal must be an instance of AbortSignal');

    assert.deepStrictEqual((await trycatch(() => (orchestrator.run({connections: [{from:['timeoutEcho']}]}), orchestrator.run({ connections: [{from:['timeoutEcho']}]})) )).error.message, 'The Orchestration is already running');

    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: ['wrong']}))).error.message, 'Invalid type for connection[0]. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: 'wrong'}]}))).error.message, 'Invalid type for connection[0].from. Expected array or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: [false]}]}))).error.message, 'Invalid type for connection[0].from[0]. Expected string but provided boolean: false');
    //@ts-ignore
    //assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['wrong']}]}))).error.message, 'Invalid function or event name in connection[0].from[0]: wrong');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:'wrong'}]}))).error.message, 'Invalid type for connection[0].to. Expected array or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:[false]}]}))).error.message, 'Invalid type for connection[0].to[0]. Expected string but provided boolean: false');
    //@ts-ignore
    //assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:['wrong']}]}))).error.message, 'Invalid function or event name in connection[0].to[0]: wrong');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:['echo'], transition: false }]}))).error.message, 'Invalid type for connection[0].transition. Expected string or undefined but provided boolean: false');
    
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], transition: '{}}}}' }]}))).error.message, 'Connection 0 transition: Syntax error: "}"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], transition: '{ "global": false }' }]}))).error.message, 'Invalid type of global variable returned by the transition of connection 0. Expected object or undefined but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], transition: '{ "local": false }' }]}))).error.message, 'Invalid type of local variable returned by the transition of connection 0. Expected object or undefined but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:['echo'], transition: '{ "to":"wrong" }' }]}))).error.message, 'Invalid type of "to" value returned by the transition of connection 0. Expected array but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:['echo'], transition: '{ "to":[] }' }]}))).error.message, 'The connection 0 transition returned "to" value must be an array of the same length of the "connection.to" array (length=1).\nReturned: [] (length=0)');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections: [{from: ['hello'], to:['echo'], transition: '{ "to":["wrong"] }' }]}))).error.message, 'Invalid type of "to[0]" value returned by the transition of connection 0. Expected array but provided string: "wrong"');

    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: 'wrong'}}))).error.message, 'Invalid type for functions["fn"]. Expected object but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {args:'wrong'}}}))).error.message, 'Invalid type for functions["fn"].args. Expected array or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {ref:false}}}))).error.message, 'Invalid type for functions["fn"].ref. Expected string or undefined but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {throws:'wrong'}}}))).error.message, 'Invalid type for functions["fn"].throws. Expected boolean or undefined but provided string: "wrong"');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {inputsTransformation:false}}}))).error.message, 'Invalid type for functions["fn"].inputsTransformation. Expected string or undefined but provided boolean: false');
    //@ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {outputTransformation:false}}}))).error.message, 'Invalid type for functions["fn"].outputTransformation. Expected string or undefined but provided boolean: false');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {ref:'wrong'}}}))).error.message, 'Function fn not valid. The provided ref do not point to a valid function');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {fn: {}}}))).error.message, 'Function fn not valid. The parameter ref is not provided and the function name do not match any valid function');
  
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {echo: {inputsTransformation: '{}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo inputsTransformation: Invalid type returned. Expected array but provided object: {}');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {echo: {inputsTransformation: '{}}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo inputsTransformation: Syntax error: "}"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({functions: {echo: {outputTransformation: '{}}'}}, connections:[{from:['echo']}]}))).error.message, 'Function echo outputTransformation: Syntax error: "}"');

    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {ev: 'wrong'}}))).error.message, 'Invalid type for events["ev"]. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {ev: {ref:false}}}))).error.message, 'Invalid type for events["ev"].ref. Expected string or undefined but provided boolean: false');
    
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {ev: {ref:'events.ev'}}, connections:[{from:['ev']}]}))).error.message, 'Invalid ref for events["ev"]. A listener with the same name already exist');

    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {ev: {once:'wrong'}}}))).error.message, 'Invalid type for events["ev"].once. Expected boolean or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {echo: {}}, functions:{echo:{}}}))).error.message, 'Invalid name for events["echo"]. A function with the same name already exist');

    assert.deepStrictEqual((await trycatch(() => orchestrator.run({events: {ev1: {once:true}}, connections:[{from:['ev1'], to:['ev1']}]}, {}, {runnings:[{id:0, inputs:['TEST']}], waitings:[{ev1:['TEST']}]}))).error.message, 'The events["ev1"].once == true but the event as been received 2 times');

    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {variables:'wrong'}))).error.message, 'Invalid type for state.variables. Expected object or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {variables:{global:'wrong'}}))).error.message, 'Invalid type for state.variables.global. Expected object or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {variables:{global:{}, locals:'wrong'}}))).error.message, 'Invalid type for state.variables.locals. Expected array or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {variables:{global:{}, locals:['wrong']}}))).error.message, 'Invalid type for state.variables.locals[0]. Expected object but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {variables:{global:{}, locals:[{}]}}))).error.message, 'Invalid length for array state.variables.locals. Expected 0 but provided 1');
    
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: 'wrong'}))).error.message, 'Invalid type for state.finals. Expected object or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {connections: 'wrong'}}))).error.message, 'Invalid type for state.finals.connections. Expected array or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {connections: [,]}}))).error.message, 'Invalid length for array state.finals.connections. Expected 0 but provided 1');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{}]}, {}, {finals: {connections: ['wrong']}}))).error.message, 'Invalid type for state.finals.connections[0]. Expected array or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {events: 'wrong'}}))).error.message, 'Invalid type for state.finals.events. Expected object or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {events: {wrong:[]}}}))).error.message, 'Invalid event name in state.finals.events: wrong');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{to:['ev1']}]}, {}, {finals: {events: {ev1:'wrong'}}}))).error.message, 'Invalid type for state.finals.events["ev1"]. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {functions: 'wrong'}}))).error.message, 'Invalid type for state.finals.functions. Expected object or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {functions: {wrong:[]}}}))).error.message, 'Invalid function name in state.finals.functions: wrong');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {finals: {functions: {hello:'wrong'}}}))).error.message, 'Invalid type for state.finals.functions["hello"]. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {errors: 'wrong'}))).error.message, 'Invalid type for state.errors. Expected object or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {errors: {wrong:[]}}))).error.message, 'Invalid function name in state.errors: wrong');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {errors: {hello:'wrong'}}))).error.message, 'Invalid type for state.errors["hello"]. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {waitings: 'wrong'}))).error.message, 'Invalid type for state.waitings. Expected array or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {waitings: [{}]}))).error.message, 'Invalid length for array state.waitings. Expected 0 but provided 1');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{}]}, {}, {waitings: ['wrong']}))).error.message, 'Invalid type for state.waitings[0]. Expected object but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{}]}, {}, {waitings: [{'functions.wrong':[]}]}))).error.message, 'Invalid name in state.waitings[0]: functions.wrong');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{}]}, {}, {waitings: [{'events.wrong':[]}]}))).error.message, 'Invalid name in state.waitings[0]: events.wrong');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{}]}, {}, {waitings: [{'functions.hello':'wrong'}]}))).error.message, 'Invalid type for state.waitings[0]["functions.hello"]. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {runnings: 'wrong'}))).error.message, 'Invalid type for state.runnings. Expected array or undefined but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {runnings: ['wrong']}))).error.message, 'Invalid type for state.runnings[0]. Expected object but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {runnings: [{id: true}]}))).error.message, 'Invalid type for state.runnings[0].id. Expected string or number but provided boolean: true');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {runnings: [{id: 0, inputs:'wrong'}]}))).error.message, 'Invalid type for state.runnings[0].inputs. Expected array but provided string: "wrong"');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {receiveds: 'wrong'}))).error.message, 'Invalid type for state.receiveds. Expected object or undefined but provided string: "wrong"');
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({}, {}, {receiveds: {wrong:[]}}))).error.message, 'Invalid event name in state.receiveds: wrong');
    // @ts-ignore
    assert.deepStrictEqual((await trycatch(() => orchestrator.run({connections:[{from:['ev1']}]}, {}, {receiveds: {ev1:'wrong'}}))).error.message, 'Invalid type for state.receiveds["ev1"]. Expected array but provided string: "wrong"');
    
  });
  
});