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
   * @property {Record<string|number, Array<Result>>} [results] Object containing the results or errors (as values) of the final executed functions/events/connections (as keys)
   * @property {Object} [variables] Object containing global and locals variables
   * @property {Record<string, any>} [variables.global] Object containing all the global variables (as keys) with their values, defined in the different connections transitions
   * @property {Array<Record<string, any>>} [variables.locals] Array of local variables for each connections defined in each connection transition
   * @property {Array<Record<string, Array<any>>>} [connections] Array of connections internal status
   * @property {Record<string, {inputs:Array<any>, id:number|string, type:"c"|"f"}>} [running] Object containing running functions or connections
   */

  /**
   * @typedef {Object} Result
   * @property {any} [error] The thrown error, if any
   * @property {any} [result] The function result, when no error is thrown: any value
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
    return new Promise((resolve, reject)=>{
      /**
       * TODO/IDEAs:
       * 1) event once: handle with a set and not a counter. throw an error if the user send the once event more then once.
       * 2) state.change fix: state is inconsistent wiht concurrent run. result should be an array. should return the error
       * 
       * 1) replace validator with valibot or typia
       * 2) jsonata, expose the available functions: could be POSSIBLE without asking input output in jsonata format to the user. 
       * 3) provide your own transformation engine?
       * 4) playground: add more samples
       * 5) option to enable multiple concurrent run? provide a unique id per run and keep multiple runs enabled?
       */

      const activeFunctions = new Set();
      const activeConnections = new Set();
      const allFrom = new Set();
      const allTo = new Set();
      const allFromEvents = new Map();
      const allToEvents = new Map();
      const allOnceEvents = new Map();
      let existEventsOnlyConnection = false;
      /** @type {Array<{event:string, callback:EventListener}>} */
      let registeredListeners = [];
      
      const functions = config?.functions ?? {};
      const events = config?.events ?? {};
      const connections = config?.connections ?? [];
      const signal = options?.signal;

      const connectionsWaitingEvents = new Array(connections.length).fill(false);

      const initState = () => {
        state.results ??= {};
        state.variables ??= {};
        state.variables.locals ??= new Array(connections.length).fill(null).map(() => ({}));
        state.variables.global ??= {};
        state.connections ??= new Array(connections.length);
      };

      const listenAll = (/** @type {Array<string>} */ eventList, /** @type {(eventsDetails:Array<any>)=>void} */ singleCallback, /** @type {Number|null} */ connectionIndex) => {
        state.connections ??= new Array(connections.length);
        /** @type {Record<string, Array<any>>} */
        const triggered = connectionIndex === null ? {} : (state.connections[connectionIndex] ??= {});

        const callback = (/** @type {Event} */ event) => {
          // @ts-ignore
          const detail = event.detail;
          (triggered[event.type] ??= []).push(detail);
          if (connectionIndex != null) {
            let connectionWaitingEvents = false;
            let connectionWaitingFunctions = false;
            connections[connectionIndex].from?.forEach((from, index)=>{
              if(!triggered[eventList[index]] || triggered[eventList[index]].filter(el=>Object.hasOwn(el, 'result')).length===0 ) { //wait also if there are errors
                if (events[from] && !events[from].once)
                  connectionWaitingEvents = true;
                else
                  connectionWaitingFunctions = true;
              }
            });
            connectionsWaitingEvents[connectionIndex] = connectionWaitingEvents && !connectionWaitingFunctions;
          }
          
          const groupedEventList = eventList.reduce((acc, cur) => (acc[cur] = (acc[cur] ?? 0) + 1, acc), /** @type {Record<string, number>} */ ({}));
          let canStart = true;
          for (const event of Object.keys(groupedEventList))
            if (!(triggered[event] && triggered[event].filter(el=>Object.hasOwn(el, 'result')).length >= groupedEventList[event]))
              canStart = false;
          
          if (canStart) {
            //const eventsDetails = eventList.map(event=>triggered[event].shift());
            const eventsDetails = eventList.map(event=>triggered[event].splice(triggered[event].findIndex(el=>Object.hasOwn(el, 'result')), 1)[0]); //filter out the errors
            Object.keys(triggered).forEach(key=>triggered[key].length===0?delete triggered[key]:null);
            if (connectionIndex != null) {
              connections[connectionIndex].from?.forEach(from=>{
                const fromResult = state.results ? state.results[from] : [];
                const index = fromResult.findIndex(el=>Object.hasOwn(el, 'result'));
                if (index!=-1)
                  fromResult.splice(index, 1);
                if (state.results && state.results[from].length===0) delete state.results[from];
              });
            }

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
        for (const listener of registeredListeners)
          this.removeEventListener(listener.event, listener.callback);
        registeredListeners = [];
        if (signal && signal instanceof AbortSignal)
          signal.removeEventListener('abort', abortHandler);
      };

      const end = (/** @type {Boolean}*/ok, /** @type {any}*/data)=> {
        clearListeners();

        if(ok) {
          initState();
          this.dispatchEvent(new CustomEvent('success', { detail: data}));
          resolve(data);
        } else {
          this.dispatchEvent(new CustomEvent('error', { detail: data}));
          reject(data);
        }
        this.#running = false;
      };

      const checkTerminate = () => activeFunctions.size === 0 && activeConnections.size === 0 && Array.from(allOnceEvents.values()).map(val=>val.counter===1).every(Boolean) && !existEventsOnlyConnection && !connectionsWaitingEvents.some(Boolean) ? end(true, { state }) : null;

      const getFunction = (/** @type {string} */ name) => functions[name]?.ref ? this.#functions[functions[name].ref] : this.#functions[name];

      const runFunction = (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
        const uniqueId = globalThis.crypto.randomUUID();
        activeFunctions.add(uniqueId);
        
        execFunction(name, args).then(ret => {
          initState();
          state.results ??= {};
          (state.results[name] ??= []).push(ret);

          activeFunctions.delete(uniqueId);
          this.dispatchEvent(new CustomEvent('state.change', { detail: { state }}));
          this.dispatchEvent(new CustomEvent(`results.${name}`, { detail: ret }));
          this.dispatchEvent(new CustomEvent(`results`, { detail: {[name]: ret} }));
          checkTerminate();
        }).catch(error => {
          activeFunctions.delete(uniqueId);
          end(false, { state, error });
        });
      };

      const execFunction = async (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
        const fn = getFunction(name);
        let ret = null;
        if (functions[name]?.inputsTransformation) {
          try {
            args = await evalTransition(functions[name]?.inputsTransformation, args);
            validate(args, ['array'], `Invalid type returned`);
          } catch (error) {
            // @ts-ignore
            throw new Error(`Function ${name} inputsTransformation: ${error.message}`);
          }
        }
        try {
          ret = {
            result: await fn(...args)
          };
        } catch(error) {
          ret = { error };
          this.dispatchEvent(new CustomEvent('errors', { detail: { [name]: ret }}));
          this.dispatchEvent(new CustomEvent(`errors.${name}`, { detail: ret }));
          if (functions[name]?.throws)
            throw error;
        }
        if (Object.hasOwn(ret, 'result') && functions[name]?.outputTransformation) {
          try {
            ret.result = await evalTransition(functions[name]?.outputTransformation, ret.result);
          } catch (error) {
            // @ts-ignore
            throw new Error(`Function ${name} outputTransformation: ${error.message}`);
          }
        }
        return ret;
      };

      const getEvent = (/** @type {string} */ name) => !events[name] ? null : events[name].ref ? events[name]?.ref : name;

      const runEvent = (/** @type {string} */ name, /** @type {any} */ detail, /** @type {boolean} */ isATo) => {
        if (!isATo) {
          allFromEvents.get(name).counter++;
          if (events[name].once) {
            allOnceEvents.get(name).counter++;
            if (allOnceEvents.get(name).counter > 1) {
              end(false, { state, error: new Error(`The events["${name}"].once == true but the event as been received ${allOnceEvents.get(name).counter} times`) });
              return;
            }
          }
        }
        initState();
        state.results ??= {};
        (state.results[name] ??= []).push({ result: detail });
        this.dispatchEvent(new CustomEvent('state.change', { detail: { state: state }}));
        this.dispatchEvent(new CustomEvent(`events`, { detail: {[name]: { result: detail } } }));
        if (isATo)
          this.dispatchEvent(new CustomEvent(allToEvents.get(name), { detail }));
        else
          this.dispatchEvent(new CustomEvent(`events.${name}`, { detail: { result: detail } }));
        checkTerminate();
      };

      const runConnection =  (/** @type {Array<any>} */fromResults, /** @type {ConnectionConfig} */connection, /** @type {Number} */connectionIndex) => {
        const uniqueId = globalThis.crypto.randomUUID();
        activeConnections.add(uniqueId);
        execConnection(fromResults, connection, connectionIndex).then(() => {
          activeConnections.delete(uniqueId);
          checkTerminate();
        }).catch(error => {
          activeConnections.delete(uniqueId);
          end(false, { state, error });
        });
      };

      const execConnection = async (/** @type {Array<any>} */fromResults, /** @type {ConnectionConfig} */connection, /** @type {Number} */connectionIndex) => {
        state.results ??= {};
        state.variables ??= {};
        state.variables.locals ??= new Array(connections.length).fill(null).map(() => ({}));
        state.variables.global ??= {};
        state.connections ??= new Array(connections.length).fill(null);

        const fromList = connection.from ?? [];
        const toList = connection.to ?? [];
        const from = [];
        
        /*
        for (const from of fromList) { //ideally this should have been done in listenAll
          state.results[from].shift();
          if (state.results[from].length===0)
            delete state.results[from];
        }*/

        for (const fromResult of fromResults) {
          //if (fromResult.error)
          //  return; //TODO: if there is an error should I start the connection at all in the listenAll? if no, what to do if later arrive a non error
          from.push(fromResult.result);
        }

        //when no transition is defined the outputs of the froms are given as first argument input parameter for the to (if there are froms)
        let transitionResults = {
          to: fromList.length > 0 ? from.map(obj=>[obj]) : new Array(toList.length).fill(null).map(() => []),
          global: state.variables.global,
          local: state.variables.locals[connectionIndex]
        };
        if (connection.transition) {
          try {
            const transitionInput = { 
              from, 
              global: state.variables.global, 
              local: state.variables.locals[connectionIndex]
            };
            //console.dir(transitionInput, {depth: null});
            transitionResults = await evalTransition(connection.transition, transitionInput);
            //console.dir(transitionResults, {depth: null});
          } catch(error) {
            // @ts-ignore
            throw new Error(`Connection ${connectionIndex} transition: ${error.message}`);
          }
        }
        const inputsList = transitionResults.to;
        validate(transitionResults.global, ['object', 'undefined'], `Invalid type of global variable returned by the transition of connection ${connectionIndex}`);
        state.variables.global = transitionResults.global ?? state.variables.global;
        validate(transitionResults.local, ['object', 'undefined'], `Invalid type of local variable returned by the transition of connection ${connectionIndex}`);
        state.variables.locals[connectionIndex] = transitionResults.local ?? state.variables.locals[connectionIndex];
        if(toList.length > 0) {
          validate(inputsList, ['array'], `Invalid type of "to" value returned by the transition of connection ${connectionIndex}`);
          if (inputsList.length != toList.length) throw new TypeError(`The connection ${connectionIndex} transition returned "to" value must be an array of the same length of the "connection.to" array (length=${toList.length}).\nReturned: ${JSON.stringify(inputsList)} (length=${inputsList.length})`);
          for (let i=0; i<toList.length; i++) {
            const to = toList[i];
            const inputs = inputsList[i];
            if (inputs == null)
              continue;
            if (events[to]) {
              runEvent(to, inputs, true);
            } else {
              validate(inputs, ['array'], `Invalid type of "to[${i}]" value returned by the transition of connection ${connectionIndex}`);
              runFunction(to, inputs);
            }
          }
        } else {
          (state.connections[connectionIndex] ??= []).push({ result: inputsList });
          this.dispatchEvent(new CustomEvent('state.change', { detail: { state: state }}));
        }
      };

      const evalTransition = (/** @type {string} */expression, /** @type {any} */json) => executeJSONata(expression, json);

      const abortHandler = () => end(false, { state, error: signal?.reason });

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
          let eventFromCounter = 0;
          fromList.forEach((from, index)=>{
            validate(from, ['string'], `Invalid type for connection[${connectionIndex}].from[${index}]`);
            if(!getFunction(from) && !getEvent(from)) throw new TypeError(`Invalid function or event name in connection[${connectionIndex}].from[${index}]`);
            allFrom.add(from);
            if (events[from]) {
              allFromEvents.set(from, { listenerName: getEvent(from), counter: 0 });
              if (events[from].once)
                allOnceEvents.set(from, { counter: 0 });
              else
                eventFromCounter++;
            }
          });
          if (fromList.length >0 && eventFromCounter === fromList.length)
            existEventsOnlyConnection = true;
          validate(connection.to, ['array', 'undefined'], `Invalid type for connection[${connectionIndex}].to`);
          const toList = connection.to ?? [];
          toList.forEach((to, index)=>{
            validate(to, ['string'], `Invalid type for connection[${connectionIndex}].to[${index}]`);
            if(!getFunction(to) && !getEvent(to)) throw new TypeError(`Invalid function or event name in connection[${connectionIndex}].to[${index}]`);
            allTo.add(to);
            if (events[to])
              allToEvents.set(to, getEvent(to));
          });

          validate(connection.transition, ['string', 'undefined'], `Invalid type for connection[${connectionIndex}].transition`);
          if (fromList.length !== 0)
            listenAll(fromList.map(from =>events[from] ? `events.${from}` : `results.${from}`), fromResults=>runConnection(fromResults, connection, connectionIndex), connectionIndex);
        }

        //initialize listeners for all user defined events
        for (const [from, fromEvent] of allFromEvents)
          listenAll([fromEvent.listenerName], eventsDetails => runEvent(from, eventsDetails[0], false), null);

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
            if (!events[from] && !allTo.has(from))
              inits[from] = [];
          });
        }

        Object.keys(events).forEach(key=>{
          validate(events[key], ['object'], `Invalid type for events["${key}"]`);
          validate(events[key].ref, ['string', 'undefined'], `Invalid type for events["${key}"].ref`);
          validate(events[key].once, ['boolean', 'undefined'], `Invalid type for events["${key}"].once`);
          if (functions[key]) throw new TypeError(`Invalid name for events["${key}"]. A function with the same name already exist`);
        });

        //initialize state
        validate(state.results, ['object', 'undefined'], `Invalid type for state.results`);
        const stateResults = state.results ?? {};
        const initialStateResultsNames = Object.keys(stateResults);
        for (const name of initialStateResultsNames) {
          validate(stateResults[name], ['array'], `Invalid type for state.results["${name}"]`);
          for(let i=0;i<stateResults[name].length;i++) {
            validate(stateResults[name][i], ['object'], `Invalid type for state.results["${name}"][${i}]`);
            if(!(Object.hasOwn(stateResults[name][i], 'result') || Object.hasOwn(stateResults[name][i], 'error')))
              throw new TypeError(`Invalid content for state.results["${[name]}"][${i}]. Expected "result" or "error"`);
          }
          if (!getFunction(name) && !getEvent(name)) throw new TypeError(`The function or event ${name} in state.results do not exist`);
        }
        validate(state.variables, ['object', 'undefined'], `Invalid type for state.variables`);
        const stateVariables = state.variables ?? {};
        validate(stateVariables.global, ['object', 'undefined'], `Invalid type for state.variables.global`);
        validate(stateVariables.locals, ['array', 'undefined'], `Invalid type for state.variables.locals`);
        const stateVariablesLocals = stateVariables.locals ?? new Array(connections.length).fill(null).map(() => ({}));
        stateVariablesLocals.forEach((local, index)=> validate(local, ['object'], `Invalid type for state.variables.locals[${index}]`));
        if(stateVariablesLocals.length != connections.length) throw new TypeError(`Invalid length for array state.variables.locals. Expected ${connections.length} but provided ${stateVariablesLocals.length}`);
        
        if (initialStateResultsNames.length > 0) {
          //dispatch all the provided function results
          for (const name of initialStateResultsNames) {
            for (const stateResult of stateResults[name]) {
              this.dispatchEvent(new CustomEvent(events[name] ? `events.${name}` : `results.${name}`, { detail: stateResult }));
              if (events[name] && events[name].once) allOnceEvents.get(name).counter++;
            }
          }
        } else {
          //run the functions for which we have initial inputs
          for(const fnId of Object.keys(inits))
            runFunction(fnId, inits[fnId]);
        }

        //run all the transitions with empty from
        for (const [connectionIndex, connection] of connections.entries())
          if ((connection.from ?? []).length === 0)
            runConnection([], connection, connectionIndex);

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