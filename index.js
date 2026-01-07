import jsonata from 'jsonata';

/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
  #running = false;
  /** @type {Object<string, Function>} */
  #functions = {};
  
  /**
   * @typedef {Object} State
   * @property {Object} [variables] Object containing global and locals variables
   * @property {Record<string, any>} [variables.global] Object containing all the global variables (as keys) with their values, defined in the different connections transitions
   * @property {Array<Record<string, any>>} [variables.locals] Array of local variables for each connections defined in each connection transition
   * @property {Object} [finals] Object containing the results of the final functions/events/connections (functions/events appearing only in the to, or connections without a to)
   * @property {Record<string, Array<any>>} [finals.functions] Object containing for every final function (as a key), an array (as a value) of produced results
   * @property {Record<string, Array<any>>} [finals.events] Object containing for every final event (as a key), an array (as a value) of dispatched detail
   * @property {Array<Array<any>|undefined>} [finals.connections] Array of connections length containing for every final connection an array of produced results, or undefined for non final connections
   * @property {Record<string, Array<any>>} [errors] Object containing for every final function (as a key), an array (as a value) of produced errors
   * @property {Array<Record<string, Array<any>>>} [waitings] Array of connections length containing for every connection an object of events (as a key) waiting to trigger the connection execution, with an array (as a value) of their dispatched details
   * @property {Array<{inputs:Array<any>, id:number|string}>} [runnings] Array of objects describing a running functions or connections.
   * @property {Record<string, Array<any>>} [receiveds] Object containing for every received event (as a key), an array (as a value) of received detail 
   */

  /**
   * Constructor
   * @param {Object} [config]
   * @param {Record<string, Function>} [config.functions] A JSON object containing as key the function name and as value the function
   * @throws {Error} In case of invalid inputs
   * @example
   *  new Orchestrator({
   *    functions: {
   *      echo: echo=>echo
   *    }
   * });
   */
  constructor (config = {}) {
    super();
    validate(config, ['object'], `Invalid type for config`);
    validate(config.functions, ['object', 'undefined'], `Invalid type for config.functions`);
    const functions = config.functions ?? {};
    for (const name of Object.keys(functions))
      validate(functions[name], ['function'], `Invalid type for config.functions["${name}"]`);
    this.#functions = functions;
  }

  /**
   * @typedef {Object} FunctionConfig An optional definition of a function to use in the different Connections with the following properties:
   * @property {string} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
   * @property {Array<any>} [args] When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
   * @property {Boolean} [throws] When true, errors thrown by the functions will throw and terminate the orchestration
   * @property {string} [inputsTransformation] When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * @property {string} [outputTransformation] When available must contain a JSONata expression to post-process the function output before being used in any connection
   */

  /**
   * @typedef {Object} EventConfig An optional definition of an event to use in the different Connections with the following properties:
   * @property {string} [ref] Reference to the name of the event to be listened. When not provided the event name is used
   * @property {boolean} [once] When available, will set the once attribute at event listening
   */

  /**
   * @typedef {Object} ConnectionConfig The connections between the services provided as an array of objects with the following properties:
   * @property {Array<string>} [from] The list of the connections from where the data is coming from
   * @property {string} [transition] The JSONata to process the data
   * @property {Array<string>} [to] The list of the connections to where the data is going to
   */

  /**
   * @typedef {Object} OptionsConfig Configurable options with the following properties:
   * @property {AbortSignal} [signal] An optional AbortSignal to abort the execution
   */

  /**
   * Run the Orchestrator
   * @param {Object} [config]
   * @param {Record<string, FunctionConfig>} [config.functions] An optional definition of functions to use in the different connections with the following properties:
   * - {string} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
   * - {Array<any>} [args]: When available, will be used as input arguments for the function during its execution at the initialization of the orchestration (only if no state is provided)
   * - {Boolean} [throws]: When true, errors thrown by the functions will throw and terminate the orchestration
   * - {string} [inputsTransformation]: When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * - {string} [outputTransformation]: When available must contain a JSONata expression to post-process the function output before being used in any connection
   * @param {Record<string, EventConfig>} [config.events] An optional definition of events to use in the different Connections with the following properties:
   * - {string} [ref] Reference to the name of the event to be listened. When not provided the event name is used.
   * - {boolean} [once] When defined as true the orchestrator will expect the event only once and is able to automatically terminate the execution. When false the orchestration should be manually terminated with an AbortSignal (default: false)
   * @param {Array<ConnectionConfig>} [config.connections] The connections between the services provided as an array of objects with the following properties:
   * - {Array<string>} [from]: The list of the connections from where the data is coming from
   * - {string} [transition]: The JSONata to process the data
   * - {Array<string>} [to]: The list of the connections to where the data is going to
   * @param {OptionsConfig} [options] Configurable options with the following properties:
   * - {AbortSignal} [signal]: An optional AbortSignal to abort the execution
   * @param {State} [state] An optional reference to a state that will be used as starting state for the execution and updated ongoing. State must be composed of the following properties:
   * - {Object<string, Result>} [results]: Object containing the results or errors (as values) of the executed functions (as keys)
   * - {Object} [variables]: Object containing global and locals variables
   * - {Object<string, any>} [variables.global]: Object containing all the global variables (as keys) with their values, defined in the different connections transitions
   * - {Array<Object<string, any>>} [variables.locals]: Array of local variables for each connections defined in each connection transition
   * @returns {Promise<{state:State}>} The function always returns a promise that rejects in case of errors or resolves with the state of the Orchestrator composed of the following properties:
   * - {Object<string, Result>} results: Object containing the results or errors (as values) of the executed functions (as keys)
   * - {Object} variables: Object containing global and locals variables
   * - {Object<string, any>} variables.global: Object containing all the global variables (as keys) with their values, defined in the different connections transitions
   * - {Array<Object<string, any>>} variables.locals: Array of local variables for each connection defined in each connection transition
   * @throws {{error:Error, state:State}} In case of errors the promise rejects with an object containing the error and the status
   * @example
   *  await run({
   *    functions: {
   *      fn1: { ref: 'echo', args: ['Hello']},
   *      fn2: { ref: 'echo', args: ['World']},
   *      fn3: { ref: 'echo' },
   *    },
   *    connections: [{
   *      from: ['fn1', 'fn2'],
   *      transition: '{ "to": [[ $.from[0] & " " & $.from[1] ]] }', //the result of fn1 (the string "Hello") is combined with the the result of fn2 (the string "World") and used as input for fn3
   *      to: ['fn3']
   *    }]
   *  });
   *
   * output:
   *  {
   *    state: {
   *      results: { fn3: { result: 'Hello World' } },
   *      variables: { global: {}, locals: [ {}, {} ] }
   *    }
   *  }
   */

  run (config = {}, options = {}, state = {}) {
    return new Promise((resolve, reject) => {
      /**
       * TODO/IDEAs:
       * TOP) 
       *   - validate config and state on usage as they can be potentially changed during run by functions/externally (eg. topology change at runtime. Should be prevented with freeze?)
       *   - atomic state updates using intermediate objectes
       *   - evens on connection execution? useful to implement custom logic to abort after x loops
       * 1) jsonata, expose the available functions: could be POSSIBLE without asking input output in jsonata format to the user. 
       * 2) provide your own transformation engine
       * 3) playground: add more samples
       */

      const allFrom = new Set();
      const allTo = new Set();
      const allFromEvents = new Set();
      const allToEvents = new Set();
      const allOnceEvents = new Map();
      const onlyTo = new Set();
      const onlyToEvents = new Set();
      const onlyFrom = new Set();
      const onlyFromEvents = new Set();
      const listenedEvents = new Map();

      /** @type {Array<{event:string, callback:EventListener}>} */
      let registeredListeners = [];
      
      const functions = config?.functions ?? {};
      const events = config?.events ?? {};
      const connections = config?.connections ?? [];
      const signal = options?.signal;

      const connectionsFromsGrouped = new Array(connections.length);

      const log = (/** @type {"ALL"|"DEBUG"|"INFO"|"WARN"|"ERROR"|"FATAL"} */ type, /** @type {any}*/ message) => this.dispatchEvent(new CustomEvent('logs', { detail: { level: {ALL:0, DEBUG:1, INFO:2, WARN:3, ERROR:4, FATAL:5}[type], type, message }}));

      const listenAll = (/** @type {Array<string>} */ eventList, /** @type {(eventsDetails:Array<any>)=>void} */ singleCallback, /** @type {Number|null} */ connectionIndex) => {
        const waiting = connectionIndex === null ? {} : (state.waitings ??= new Array(connections.length), state.waitings[connectionIndex] ??= {});
        const groupedEventList = eventList.reduce((acc, cur) => (acc[cur] = (acc[cur] ?? 0) + 1, acc), /** @type {Record<string, number>} */ ({}));

        const callback = (/** @type {Event} */ event) => {
          // @ts-ignore
          const detail = event.detail;
          (waiting[event.type] ??= []).push(detail);
          if (connectionIndex === null)
            (state.receiveds ??= {}, state.receiveds[event.type] ??= []).push(detail);

          log('INFO', connectionIndex != null ? `Connection ${connectionIndex} received event ${event.type}` : `Received event ${event.type}`);
          log('DEBUG', `${event.type} detail:`);
          log('DEBUG', detail);

          const canStart = Object.keys(groupedEventList).map(name=>waiting[name] && waiting[name].length >= groupedEventList[name]).every(Boolean);
          if (canStart) {
            const eventsDetails = eventList.map(event=>waiting[event].shift());
            Object.keys(waiting).forEach(key=>waiting[key].length===0?delete waiting[key]:null);

            singleCallback(eventsDetails);
          } else {
            checkTerminate();
          }
        };
        for (const event of eventList) {
          this.addEventListener(event, callback);
          registeredListeners.push({event, callback});
        }
      };

      const clearListeners = () => {
        log('INFO', `clearListeners`);
        for (const listener of registeredListeners)
          this.removeEventListener(listener.event, listener.callback);
        registeredListeners = [];
        if (signal && signal instanceof AbortSignal)
          signal.removeEventListener('abort', abortHandler);
      };

      const end = (/** @type {Boolean}*/ok, /** @type {any}*/data)=> {
        clearListeners();
        if(ok) {
          log('INFO', `end with success`);
          this.dispatchEvent(new CustomEvent('success', { detail: data}));
          resolve(data);
        } else {
          log('FATAL', `end with error:`);
          log('FATAL', data.error);
          this.dispatchEvent(new CustomEvent('error', { detail: data}));
          reject(data);
        }
        log('DEBUG', `state:`);
        log('DEBUG', data.state);
        this.#running = false;
      };
      
      const checkTerminate = () => {
        if ((state.runnings??=[]).length > 0)
          return;
        log('DEBUG', `checkTerminate: state.runnings.length === 0`);

        let canEnd = true;
        for (let i = 0; i < connections.length; i++) {
          const groupedFrom = connectionsFromsGrouped[i];
          const waiting = state.waitings?.[i];
          let missingCount = 0;
          let hasDeadlock = false; // "Deadlock" means missing a Function or Consumed-Once
          for (const from of Object.keys(groupedFrom)) {
            const isFunction = getFunction(from) != null;
            const isOnceAlreadyReceived = events[from]?.once === true && allOnceEvents.get(from).counter > 0;
            const isMissing = groupedFrom[from] > (waiting?.[isFunction ? `functions.${from}` : `events.${from}`] ?? []).length;
            if (isMissing) {
              missingCount++;
              log('DEBUG', `checkTerminate: connection ${i} missing "${from}"`);
              if (isFunction || isOnceAlreadyReceived) {
                hasDeadlock = true;
                log('DEBUG', `checkTerminate: connection ${i} hasDeadlock on "${from}" (isFunction=${isFunction}, isOnceAlreadyReceived=${isOnceAlreadyReceived}))`);
                break;
              }
            }
          }
          const allowsTermination = missingCount === 0 || hasDeadlock;
          if (!allowsTermination) {
            log('DEBUG', `checkTerminate: connection ${i} NOT allowsTermination (missingCount=${missingCount}, hasDeadlock=${hasDeadlock}))`);
            canEnd = false;
            break;
          }
        }
        if (canEnd)
          end(true, { state });

        //Original less efficient version:
        //if ((state.runnings??=[]).length > 0) return;
        //const allConnectionsAllowsTermination = (state.waitings??=[]).map((waiting, index) => {
        //  const groupedFrom = connectionsFromsGrouped[index];
        //  const missingFrom = Object.keys(groupedFrom).filter(from => groupedFrom[from] > (waiting[getFunction(from)?`functions.${from}`:`events.${from}`] ?? []).length);
        //  log('DEBUG', `checkTerminate: connection ${index} missingFrom: ${missingFrom}`);
        //  const deadlockedFrom = missingFrom.map(from => getFunction(from) != null || (events[from]?.once === true && allOnceEvents.get(from).counter > 0));
        //  log('DEBUG', `checkTerminate: connection ${index} deadlockedFrom: ${deadlockedFrom}`);
        //  const allowsTermination = missingFrom.length === 0 || deadlockedFrom.some(Boolean);
        //  log('DEBUG', `checkTerminate: connection ${index} allowsTermination: ${allowsTermination}`);
        //  return allowsTermination;
        //}).every(Boolean);
        //log('DEBUG', `checkTerminate: allConnectionsAllowsTermination = ${allConnectionsAllowsTermination}`);
        //if (allConnectionsAllowsTermination) end(true, { state });
      };

      const getFunction = (/** @type {string} */ name) => functions[name]?.ref ? this.#functions[functions[name].ref] : this.#functions[name];

      const runFunction = (/** @type {string} */ name, /** @type {Array<any>} */ args, /** @type {{inputs:Array<any>, id:number|string}|undefined} */ runningInit) => {
        const running = runningInit ?? { id: name, inputs: args };
        if (!runningInit) {
          stateAddRunning(running);
        }
        log('INFO', `Function ${name} start`);
        log('DEBUG', `Function ${name} inputs: `);
        log('DEBUG', args);

        execFunction(name, args).then(ret => {
          stateDelRunning(running);
          if (Object.hasOwn(ret, 'result')) {
            log('INFO', `Function ${name} end`);
            log('DEBUG', `Function ${name} result:`);
            log('DEBUG', ret.result);
            this.dispatchEvent(new CustomEvent(`functions.${name}`, { detail: ret.result }));
            this.dispatchEvent(new CustomEvent(`functions`, { detail: {[name]: ret.result} }));
            if (onlyTo.has(name))
              stateAddFinal(name, ret.result);
          } else {
            log('ERROR', `Function ${name} end with errors`);
            log('ERROR', `Function ${name} error:`);
            log('ERROR', ret.error);
            this.dispatchEvent(new CustomEvent('errors', { detail: { [name]: ret.error }}));
            this.dispatchEvent(new CustomEvent(`errors.${name}`, { detail: ret.error }));
            (state.errors ??= {}, state.errors[name] ??= []).push(ret.error);
          }
          checkTerminate();
        }).catch(error => {
          stateDelRunning(running);
          end(false, { state, error });
        });
      };

      const execFunction = async (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
        const fn = getFunction(name);
        let ret = null;
        if (functions[name]?.inputsTransformation) {
          try {
            log('DEBUG', `Function ${name} inputsTransformation inputs:`);
            log('DEBUG', args);
            args = await evalTransition(functions[name]?.inputsTransformation, args);
            validate(args, ['array'], `Invalid type returned`);
            log('DEBUG', `Function ${name} inputsTransformation results:`);
            log('DEBUG', args);
          } catch (error) {
            log('FATAL', `Function ${name} inputsTransformation error:`);
            log('FATAL', error);
            // @ts-ignore
            throw new Error(`Function ${name} inputsTransformation: ${error.message}`);
          }
        }
        try {
          ret = {
            result: await fn(...args)
          };
        } catch(/** @type {any} */ error) {
          if (functions[name]?.throws)
            throw new Error(`${name}: ${error.message ?? error }`);
          ret = { error };
        }
        if (Object.hasOwn(ret, 'result') && functions[name]?.outputTransformation) {
          try {
            log('DEBUG', `Function ${name} outputTransformation inputs:`);
            log('DEBUG', ret.result);
            ret.result = await evalTransition(functions[name]?.outputTransformation, ret.result);
            log('DEBUG', `Function ${name} outputTransformation result:`);
            log('DEBUG', ret.result);
          } catch (error) {
            log('FATAL', `Function ${name} outputTransformation error:`);
            log('FATAL', error);
            // @ts-ignore
            throw new Error(`Function ${name} outputTransformation: ${error.message}`);
          }
        }
        return ret;
      };

      const getEvent = (/** @type {string} */ name) => !events[name] ? null : events[name].ref ? events[name]?.ref : name;

      const runEvent = (/** @type {string} */ name, /** @type {any} */ detail, /** @type {boolean} */ isATo) => {
        log('DEBUG', `Run ${isATo?'"to"':'"from"'} event ${name}`);
        if (!isATo) {
          if (allOnceEvents.has(name)) {
            allOnceEvents.get(name).counter++;
            log('DEBUG', `Once Event ${name} counter: ${allOnceEvents.get(name).counter}`);
            if (allOnceEvents.get(name).counter > 1) {
              end(false, { state, error: new Error(`The events["${name}"].once == true but the event as been received ${allOnceEvents.get(name).counter} times`) });
              return;
            }
          }
        }
        
        if (onlyTo.has(name))
          stateAddFinal(name, detail);
        this.dispatchEvent(new CustomEvent(`events`, { detail: {[name]: detail } }));

        const eventName = isATo ? getEvent(name) ?? name : `events.${name}`;
        log('INFO', `Event ${eventName} dispatch`);
        log('DEBUG', `Event ${eventName} detail:`);
        log('DEBUG', detail);
        this.dispatchEvent(new CustomEvent(eventName, { detail }));
      };

      const runConnection =  (/** @type {Number} */connectionIndex, /** @type {Array<any>} */fromResults, /** @type {{inputs:Array<any>, id:number|string}|undefined} */ runningInit) => {
        const running = runningInit ?? { id: connectionIndex, inputs: fromResults };
        if (!runningInit)
          stateAddRunning(running);
        
        log('INFO', `Connection ${connectionIndex} start`);
        log('DEBUG', `Connection ${connectionIndex} inputs:`);
        log('DEBUG', fromResults);
        execConnection(connectionIndex, fromResults).then(ret => {
          stateDelRunning(running);
          log('INFO', `Connection ${connectionIndex} end`);
          log('DEBUG', `Connection ${connectionIndex} result:`);
          log('DEBUG', ret);
          if (ret.toSave) {
            stateAddFinal(connectionIndex, ret.toSave);
          } else {
            for (const toRun of ret.toRun) {
              if (toRun.event)
                runEvent(toRun.to, toRun.inputs, true);
              else
                runFunction(toRun.to, toRun.inputs, undefined);
            }
          }
          dispatchStateChange();
          checkTerminate();
        }).catch(error => {
          stateDelRunning(running);
          end(false, { state, error });
        });
      };

      const execConnection = async (/** @type {Number} */connectionIndex, /** @type {Array<any>} */fromResults) => {
        const connection = connections[connectionIndex];
        const fromList = connection.from ?? [];
        const toList = connection.to ?? [];
        const from = [];

        for (const fromResult of fromResults)
          from.push(fromResult);

        //when no transition is defined the outputs of the froms are given as first argument input parameter for the to (if there are froms)
        let transitionResults = {
          to: fromList.length > 0 ? from.map(obj=>obj===null?null:[obj]) : new Array(toList.length).fill(null).map(() => []),
          global: state.variables?.global,
          local: state.variables?.locals?.[connectionIndex]
        };
        if (connection.transition) {
          try {
            const transitionInput = { 
              from, 
              global: state.variables?.global,
              local: state.variables?.locals?.[connectionIndex]
            };
            log('DEBUG', `Connection ${connectionIndex} transition inputs:`);
            log('DEBUG', transitionInput);
            transitionResults = await evalTransition(connection.transition, transitionInput);
            log('DEBUG', `Connection ${connectionIndex} transition result:`);
            log('DEBUG', transitionResults);
          } catch(error) {
            log('FATAL', `Connection ${connectionIndex} transition error:`);
            log('FATAL', error);
            // @ts-ignore
            throw new Error(`Connection ${connectionIndex} transition: ${error.message}`);
          }
        }
        const inputsList = transitionResults.to;
        validate(transitionResults.global, ['object', 'undefined'], `Invalid type of global variable returned by the transition of connection ${connectionIndex}`);
        if (transitionResults.global) stateSetVariableGlobal(transitionResults.global);
        validate(transitionResults.local, ['object', 'undefined'], `Invalid type of local variable returned by the transition of connection ${connectionIndex}`);
        if (transitionResults.local) stateSetVariableLocal(transitionResults.local, connectionIndex);
        /** @type {{toRun: Array<{ event: boolean, to:string, inputs:any }>, toSave:any }} */
        const ret = { toRun:[], toSave: null};
        if(toList.length > 0) {
          validate(inputsList, ['array'], `Invalid type of "to" value returned by the transition of connection ${connectionIndex}`);
          if (inputsList.length != toList.length) throw new TypeError(`The connection ${connectionIndex} transition returned "to" value must be an array of the same length of the "connection.to" array (length=${toList.length}).\nReturned: ${JSON.stringify(inputsList)} (length=${inputsList.length})`);
          
          for (let i=0; i<toList.length; i++) {
            const to = toList[i];
            const inputs = inputsList[i];
            if (inputs == null)
              continue;
            if (getFunction(to)) {
              validate(inputs, ['array'], `Invalid type of "to[${i}]" value returned by the transition of connection ${connectionIndex}`);
              ret.toRun.push({ event: false, to, inputs});
            } else {
              ret.toRun.push({ event: true, to, inputs});
            }
          }
          return ret;
        } else {
          //stateAddResult(connectionIndex, inputsList);
          ret.toSave = inputsList;
          return ret;
        }
      };

      const evalTransition = (/** @type {string} */expression, /** @type {any} */json) => executeJSONata(expression, json);

      const abortHandler = () => end(false, { state, error: signal?.reason });

      const dispatchStateChange = () => this.dispatchEvent(new CustomEvent('state.change', { detail: { state: state }}));

      const stateAddFinal = (/** @type {string|number} */to, /** @type {any} */ result) => {
        state.finals ??= {};
        state.finals.connections ??= new Array(connections.length);
        state.finals.events ??= {};
        state.finals.functions ??= {};
        if (typeof to === 'number') {
          (state.finals.connections[to] ??= []).push(result);
        } else {
          if (getFunction(to))
            (state.finals.functions[to] ??= []).push(result);
          else
            (state.finals.events[to] ??= []).push(result);
        }
      };

      const stateAddRunning = (/** @type {any} */ running) => state.runnings?.push(running);

      const stateDelRunning = (/** @type {any} */ running) => state.runnings?.splice(state.runnings.indexOf(running), 1);

      const stateSetVariableGlobal = (/** @type {Object} */ global) => (state.variables ??= {}).global = global;

      const stateSetVariableLocal = (/** @type {Object} */ local, /** @type {Number} */ connectionIndex) => (state.variables ??= {}, state.variables.locals ??= new Array(connections.length).fill(null).map(() => ({})))[connectionIndex] = local;

      try {
        validate(config, ['object'], `Invalid type for config`);
        validate(options, ['object'], `Invalid type for options`);
        validate(state, ['object'], `Invalid type for state`);
        validate(config.functions, ['object', 'undefined'], `Invalid type for config.functions`);
        validate(config.events, ['object', 'undefined'], `Invalid type for config.events`);
        validate(config.connections, ['array', 'undefined'], `Invalid type for config.connections`);
        if(signal && !(signal instanceof AbortSignal)) throw new TypeError('The provided signal must be an instance of AbortSignal');

        if (this.#running) throw new Error('The Orchestration is already running');
        this.#running = true;

        if(signal) {
          signal.addEventListener('abort', abortHandler, { once: true });
          if (signal.aborted) {
            end(false, { state, error: signal.reason });
            return;
          }
        }

        //initialize listeners for every connection
        for (const [connectionIndex, connection] of connections.entries()) {
          validate(connection, ['object'], `Invalid type for connection[${connectionIndex}]`);
          validate(connection.from, ['array', 'undefined'], `Invalid type for connection[${connectionIndex}].from`);
          const fromList = connection.from ?? [];
          fromList.forEach((from, index)=>{
            validate(from, ['string'], `Invalid type for connection[${connectionIndex}].from[${index}]`);
            allFrom.add(from);
            if (!getFunction(from)) {
              allFromEvents.add(from);
              if (events[from]?.once)
                allOnceEvents.set(from, { counter: 0 });
            }
          });
          connectionsFromsGrouped[connectionIndex] = fromList.reduce((acc, cur) => (acc[cur] = (acc[cur] ?? 0) + 1, acc), /** @type {Record<string, number>} */ ({}));
          validate(connection.to, ['array', 'undefined'], `Invalid type for connection[${connectionIndex}].to`);
          const toList = connection.to ?? [];
          toList.forEach((to, index)=>{
            validate(to, ['string'], `Invalid type for connection[${connectionIndex}].to[${index}]`);
            allTo.add(to);
            if (!getFunction(to))
              allToEvents.add(to);
          });
          validate(connection.transition, ['string', 'undefined'], `Invalid type for connection[${connectionIndex}].transition`);
          if (fromList.length !== 0) {
            const fromListenersList = fromList.map(from =>getFunction(from) ? `functions.${from}` : `events.${from}`);
            listenAll(fromListenersList, fromResults=>runConnection(connectionIndex, fromResults, undefined), connectionIndex);
            fromListenersList.forEach((listener, i) => listenedEvents.set(listener, fromList[i]));
          }
        }

        allTo.forEach(to=>{if (!allFrom.has(to)) onlyTo.add(to);});
        allFrom.forEach(from=>{if (!allTo.has(from)) onlyFrom.add(from);});
        allToEvents.forEach(to=>{if (!allFrom.has(to)) onlyToEvents.add(to);});
        allFromEvents.forEach(from=>{if (!allTo.has(from)) onlyFromEvents.add(from);});

        //identify initial functions
        /** @type {Object<string, Array<any>>} */
        const inits = {};
        Object.keys(functions).forEach(key=>{
          validate(functions[key], ['object'], `Invalid type for functions["${key}"]`);
          validate(functions[key].args, ['array', 'undefined'], `Invalid type for functions["${key}"].args`);
          validate(functions[key].ref, ['string', 'undefined'], `Invalid type for functions["${key}"].ref`);
          validate(functions[key].throws, ['boolean', 'undefined'], `Invalid type for functions["${key}"].throws`);
          validate(functions[key].inputsTransformation, ['string', 'undefined'], `Invalid type for functions["${key}"].inputsTransformation`);
          validate(functions[key].outputTransformation, ['string', 'undefined'], `Invalid type for functions["${key}"].outputTransformation`);
          if (!getFunction(key)) throw new TypeError(`Function ${key} not valid. ${functions[key].ref?'The provided ref do not point to a valid function':'The parameter ref is not provided and the function name do not match any valid function'}`);
          if (functions[key].args)
            inits[key] = functions[key].args;
        });

        //if the user does not provide initial inputs, will automatically find functions that can start, passing no inputs
        if (Object.keys(inits).length === 0) {
          allFrom.forEach(from => {
            if (getFunction(from) && !allTo.has(from))
              inits[from] = [];
          });
        }

        Object.keys(events).forEach(key=>{
          validate(events[key], ['object'], `Invalid type for events["${key}"]`);
          validate(events[key].ref, ['string', 'undefined'], `Invalid type for events["${key}"].ref`);
          if (events[key].ref && (listenedEvents.has(events[key].ref) || allFromEvents.has(events[key].ref))) throw new TypeError(`Invalid ref for events["${key}"]. A listener with the same name already exist`);
          validate(events[key].once, ['boolean', 'undefined'], `Invalid type for events["${key}"].once`);
          if (getFunction(key)) throw new TypeError(`Invalid name for events["${key}"]. A function with the same name already exist`);
        });

        //initialize listeners for all user dispatched events: every from has a listener that dispatch events.from
        for (const from of allFromEvents) {
          listenAll([getEvent(from) ?? from], eventsDetails => runEvent(from, eventsDetails[0], false), null);
          listenedEvents.set(getEvent(from) ?? from, from);
        }

        //initialize state
        validate(state.variables, ['object', 'undefined'], `Invalid type for state.variables`);
        state.variables ??= {};
        validate(state.variables.global, ['object', 'undefined'], `Invalid type for state.variables.global`);
        state.variables.global ??= {};
        validate(state.variables.locals, ['array', 'undefined'], `Invalid type for state.variables.locals`);
        state.variables.locals ??= new Array(connections.length).fill(null).map(() => ({}));
        state.variables.locals.forEach((local, index)=> validate(local, ['object'], `Invalid type for state.variables.locals[${index}]`));
        if (state.variables.locals.length != connections.length) throw new TypeError(`Invalid length for array state.variables.locals. Expected ${connections.length} but provided ${state.variables.locals.length}`);
        
        validate(state.finals, ['object', 'undefined'], `Invalid type for state.finals`);
        state.finals ??= {};
        validate(state.finals.connections, ['array', 'undefined'], `Invalid type for state.finals.connections`);
        state.finals.connections ??= new Array(connections.length);
        if (state.finals.connections.length != connections.length) throw new TypeError(`Invalid length for array state.finals.connections. Expected ${connections.length} but provided ${state.finals.connections.length}`);
        state.finals.connections.forEach((connection, i) => validate(connection, ['array', 'undefined'], `Invalid type for state.finals.connections[${i}]`));
        validate(state.finals.events, ['object', 'undefined'], `Invalid type for state.finals.events`);
        state.finals.events ??= {};
        const finalEvents = state.finals.events;
        Object.keys(finalEvents).forEach(name => {
          if (!onlyToEvents.has(name)) throw new TypeError(`Invalid event name in state.finals.events: ${name}`);
          validate(finalEvents[name], ['array'], `Invalid type for state.finals.events["${name}"]`);
        });
        validate(state.finals.functions, ['object', 'undefined'], `Invalid type for state.finals.functions`);
        state.finals.functions ??= {};
        const finalFunctions = state.finals.functions;
        Object.keys(finalFunctions).forEach(name => {
          if (!getFunction(name)) throw new TypeError(`Invalid function name in state.finals.functions: ${name}`);
          validate(finalFunctions[name], ['array'], `Invalid type for state.finals.functions["${name}"]`);
        });

        validate(state.errors, ['object', 'undefined'], `Invalid type for state.errors`);
        state.errors ??= {};
        const stateErrors = state.errors;
        Object.keys(state.errors).forEach(name => {
          if (!getFunction(name)) throw new TypeError(`Invalid function name in state.errors: ${name}`);
          validate(stateErrors[name], ['array'], `Invalid type for state.errors["${name}"]`);
        });

        validate(state.waitings, ['array', 'undefined'], `Invalid type for state.waitings`);
        state.waitings ??= new Array(connections.length).fill(null).map(() => ({}));
        if(state.waitings.length != connections.length) throw new TypeError(`Invalid length for array state.waitings. Expected ${connections.length} but provided ${state.waitings.length}`);
        state.waitings.forEach((conn, i)=>{
          validate(conn, ['object'], `Invalid type for state.waitings[${i}]`);
          Object.keys(conn).forEach(eventName=>{
            const type_name = eventName.split('.');
            if ((type_name[0] === 'functions' && !getFunction(type_name[1])) || (type_name[0] === 'events' && !allFromEvents.has(type_name[1]))) throw new TypeError(`Invalid name in state.waitings[${i}]: ${eventName}`);
            validate(conn[eventName], ['array'], `Invalid type for state.waitings[${i}]["${eventName}"]`);
            if (type_name[0] === 'events' && allOnceEvents.has(type_name[1]) && allOnceEvents.get(type_name[1]).counter === 0)
              allOnceEvents.get(type_name[1]).counter = conn[eventName].length; //restore once events counter
          });
        });

        validate(state.runnings, ['array', 'undefined'], `Invalid type for state.runnings`);
        state.runnings ??= [];
        state.runnings.forEach((run, i)=>{
          validate(run, ['object'], `Invalid type for state.runnings[${i}]`);
          validate(run.id, ['string', 'number'], `Invalid type for state.runnings[${i}].id`);
          validate(run.inputs, ['array'], `Invalid type for state.runnings[${i}].inputs`);
        });

        validate(state.receiveds, ['object', 'undefined'], `Invalid type for state.receiveds`);
        state.receiveds ??= {};
        const stateReceiveds = state.receiveds;
        Object.keys(state.receiveds).forEach(name => {
          if (!listenedEvents.has(name)) throw new TypeError(`Invalid event name in state.receiveds: ${name}`);
          validate(stateReceiveds[name], ['array'], `Invalid type for state.receiveds["${name}"]`);
          const fromName = listenedEvents.get(name);
          if (allOnceEvents.has(fromName) && allOnceEvents.get(fromName).counter === 0)
            allOnceEvents.get(fromName).counter = stateReceiveds[name].length; //restore once events counter
        });

        const nonEmptyState = state.runnings.length > 0 || state.waitings.map(conn=>Object.keys(conn).length>0).some(Boolean) || Object.keys(state.errors).length > 0 || Object.keys(state.finals.functions).length > 0 || Object.keys(state.finals.events).length > 0 || state.finals.connections.map(conn=>conn && conn.length > 0).some(Boolean);
        if (nonEmptyState) {
          //restart all the running functions and connections
          for (const running of state.runnings) {
            if (typeof running.id === 'string')
              runFunction(running.id, running.inputs, running);
            else
              runConnection(running.id, running.inputs, running);
          }
        } else {
          //run the functions for which we have initial inputs
          for(const fnId of Object.keys(inits))
            runFunction(fnId, inits[fnId], undefined);
        }

        //run all the transitions with empty from
        for (const [connectionIndex, connection] of connections.entries())
          if ((connection.from ?? []).length === 0)
            runConnection(connectionIndex, [], undefined);

        checkTerminate();
      } catch(error) {
        end(false, { state, error });
      }
    });
  }
}

async function executeJSONata(/** @type {string} */expression, /** @type {any} */json) {
  /** @type {Object<string, any>} */
  const placeholders = {};
  const addPlaceholders = (/** @type {any} */ json) => {
    const type = typeof json;
    if (type === 'function' || type === 'symbol') {
      const placeholder = globalThis.crypto.randomUUID();
      placeholders[placeholder] = json;
      return placeholder;
    } else if (type === 'object') {
      if (json === null) return null;
      const isArray = Array.isArray(json);
      const obj = isArray ? [] : {};
      for (const el of isArray ? json : Object.keys(json)) {
        // @ts-ignore
        isArray ? obj.push(addPlaceholders(el)) : obj[el] = addPlaceholders(json[el]);
      }
      return obj;
    } else {
      return json;
    }
  };
  const restorePlaceholders = (/** @type {any} */ json) => {
    const type = typeof json;
    if (type === 'string') {
      for (const placeholder of Object.keys(placeholders)) {
        if (json === placeholder) {
          return placeholders[placeholder];
        }
      }
      return json;
    } else if (type === 'object') {
      if (json === null) return null;
      const isArray = Array.isArray(json);
      const obj = isArray ? [] : {};
      for (const el of isArray ? json : Object.keys(json)) {
        // @ts-ignore
        isArray ? obj.push(restorePlaceholders(el)) : obj[el] = restorePlaceholders(json[el]);
      }
      return obj;
    } else {
      return json;
    }
  };

  const jsonWithoutFnSym = addPlaceholders(json);
  const res = await jsonata(expression).evaluate(jsonWithoutFnSym);
  const resWithFnSym = restorePlaceholders(res);
  return resWithFnSym;
}

function validate(/** @type {any} */ value, /** @type {Array<"undefined" | "boolean" | "number" | "string" | "object" | "function" | "symbol" | "bigint" | "array">} */ types, /** @type {string} */ message = 'Error') {
  const valueType = Array.isArray(value) ? 'array' : typeof value;
  if (value === undefined && types.includes('undefined')) return;
  if (value === null || value === undefined) throw new TypeError(`${message}. Missing required value`);
  if (!types.includes(valueType)) throw new TypeError(`${message}. Expected ${types.join(" or ")} but provided ${valueType}: ${JSON.stringify(value)}`);
}