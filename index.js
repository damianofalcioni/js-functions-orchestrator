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
   * @property {Object<string, Results>} results Object containing the results or errors (as values) of the executed functions (as keys)
   * @property {Object} variables Object containing global and locals variables
   * @property {Object<string, any>} variables.global Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * @property {Array<Object<string, any>>} variables.locals Array of local variables for each connections defined in each connection transition
   */

  /**
   * @typedef {Object} Results
   * @property {any} [error] The thrown error
   * @property {string|null} [message] The message when available in error.message or null
   * @property {any} [result] The function result: any value
   */
  
  /** @type {State} */
  #initialState = {
    results: {},
    variables: {
      global: {},
      locals: []
    }
  };

  /**
   * Constructor
   * @param {Object} config
   * @param {Record<string, Function>} config.functions A JSON object containing as key the function name and as value the function
   * @example
   *  new Orchestrator({
   *    functions: {
   *      echo: echo=>echo
   *    },
   *    explicitInitsOnly: false
   * });
   */
  constructor ({ functions = {} }) {
    super();
    validate(functions, 'object', true, `Invalid type for functions`);
    for (const name of Object.keys(functions))
      validate(functions[name], 'function', true, `Invalid type for functions['${name}']`);
    this.#functions = functions;
  }

  /**
   * Set the initial orchestration status
   * @param {State} state The orchestration state
   */
  setState (state) {
    validate(state, 'object', true, `Invalid type for state`);
    validate(state.results, 'object', true, `Invalid type for state.results`);
    for (const name of Object.keys(state.results)) {
      validate(state.results[name], 'object', true, `Invalid type for state.results['${name}']`);
      if(!(state.results[name].result || state.results[name].error))
        throw new TypeError(`Invalid content for state.results['${[name]}']. Expected "result" or "error".`);
    }
    validate(state.variables, 'object', true, `Invalid type for state.variables`);
    validate(state.variables.global, 'object', true, `Invalid type for state.variables.global`);
    validate(state.variables.locals, 'array', true, `Invalid type for state.variables.locals`);
    this.#initialState = state;
  }

  /**
   * @typedef {Object} FunctionConfig An optional definition of functions to use in the different Connections with the following properties:
   * @property {string|undefined} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
   * @property {Array<any>|undefined} [args] When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
   * @property {Boolean|undefined} [throws] When true, errors thrown by the functions will throw and terminate the orchestration
   * @property {string|undefined} [inputsTransformation] When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * @property {string|undefined} [outputTransformation] When available must contain a JSONata expression to post-porcess the function output before being used in any connection
   */

  /**
   * @typedef {Object} ConnectionConfig The connections between the services provided as an array of objects with the following properties:
   * @property {string[]} from The list of the connections from where the data is coming from
   * @property {string|undefined} [transition] The JSONata to process the data
   * @property {string[]|undefined} [to] The list of the connections to where the data is going to
   */

  /**
   * @typedef {Object} OptionsConfig Configurable options with the following properties:
   * @property {AbortSignal|undefined} [signal] An optional AbortSignal to abort the execution
   */

  /**
   * Run the Orchestrator
   * @param {Object} [config]
   * @param {Record<string, FunctionConfig>|undefined} [config.functions] An optional definition of functions to use in the different connections with the following properties:
   * - {string|undefined} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
   * - {Array<any>|undefined} [args]: When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
   * - {Boolean|undefined} [throws]: When true, errors thrown by the functions will throw and terminate the orchestration
   * - {string|undefined} [inputsTransformation]: When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * - {string|undefined} [outputTransformation]: When available must contain a JSONata expression to post-porcess the function output before being used in any connection
   * @param {ConnectionConfig[]|undefined} [config.connections] The connections between the services provided as an array of objects with the following properties:
   * - {string[]} from: The list of the connections from where the data is coming from
   * - {string|undefined} [transition]: The JSONata to process the data
   * - {string[]|undefined} [to]: The list of the connections to where the data is going to
   * @param {OptionsConfig|undefined} [options] Configurable options with the following properties:
   * - {AbortSignal|undefined} [signal]: An optional AbortSignal to abort the execution
   * @returns {Promise<{state:State}>} The function always return a promise that rejects in case of errors or resolves with the state of the Orchestrator composed of the following properties:
   * - {Object<string, Results>} results: Object cantaining the results or errors (as values) of the executed functions (as keys)
   * - {Object} variables: Object containing global and locals variables
   * - {Object<string, any>} variables.global: Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * - {Array<Object<string, any>>} variables.locals: Array of local variables for each connections defined in each connection transition
   * @throws {{error:Error, state:State}} In case of errors the promise reject with an object containing the error and the status
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

  run ({
    functions = {},
    connections = []
  } = {}, 
  { 
    signal
  } = {}) {
    return new Promise((resolve, reject) => {
      //TODO: jsonata, expose the available functions: could be POSSIBLE without asking input output in jsonata format to the user. 
      //TODO: playground: add more samples
      //TODO: coverage
      /** @type {State} */
      const state = {
        results: {},
        variables: {
          global: {},
          locals: new Array(connections.length).fill(null).map(() => ({}))
        }
      };

      const activeFunctions = new Set();
      const activeConnections = new Set();
      const allFrom = new Set();
      const allTo = new Set();
      /** @type {Array<{event:string, callback:EventListener}>} */
      let registeredListeners = [];

      const listenAll = (/** @type {Array<string>} */ events, /** @type {(eventsDetails:Array<any>)=>Promise<any>} */ singleCallback) => {
        const triggered = new Map();
        const callback = (/** @type {Event} */ event) => {
          // @ts-ignore
          triggered.set(event.type, event.detail);
          if (triggered.size === events.length) {
            const eventsDetails = events.map(event=>triggered.get(event));
            triggered.clear();
            const uniqueId = globalThis.crypto.randomUUID();
            activeConnections.add(uniqueId);
            singleCallback(eventsDetails).then(() => {
              activeConnections.delete(uniqueId);
              checkTerminate();
            }).catch(error => {
              end(false, { state, error });
            });
          } else {
            checkTerminate();
          }
        };
        for (const event of events) {
          this.addEventListener(event, callback);
          registeredListeners.push({event, callback});
        }
      };

      const clearListeners = () => {
        for (const listener of registeredListeners)
          this.removeEventListener(listener.event, listener.callback);
        registeredListeners = [];
        if (signal)
          signal.removeEventListener('abort', abortHandler);
      };

      const end = (/** @type {Boolean}*/ok, /** @type {any}*/data)=> {
        clearListeners();
        if(ok) {
          this.dispatchEvent(new CustomEvent('success', { detail: data}));
          resolve(data);
        } else {
          this.dispatchEvent(new CustomEvent('error', { detail: data}));
          reject(data);
        }
        this.#running = false;
      };

      const checkTerminate = () => activeFunctions.size === 0 && activeConnections.size === 0 ? end(true, { state }) : null;

      const getFunction = (/** @type {string} */ name) => functions[name]?.ref ? this.#functions[functions[name].ref] : this.#functions[name];

      const runFunction = (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
        const uniqueId = globalThis.crypto.randomUUID();
        activeFunctions.add(uniqueId);

        execFunction(name, args).then(ret => {
          state.results[name] = ret;
          activeFunctions.delete(uniqueId);
          this.dispatchEvent(new CustomEvent('state.change', { detail: { state: state }}));
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
            if (!Array.isArray(args)) throw new Error(`The function ${name} inputsTransformation return value must be an array.\nReturned: ${JSON.stringify(args)}`);
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
        if (ret.result && functions[name]?.outputTransformation) {
          try {
            ret.result = await evalTransition(functions[name]?.outputTransformation, ret.result);
          } catch (error) {
            // @ts-ignore
            throw new Error(`Function ${name} outputTransformation: ${error.message}`);
          }
        }
        return ret;
      };

      const evalTransition = (/** @type {string} */expression, /** @type {any} */json) => executeJSONata(expression, json);

      const abortHandler = () => end(false, { state, error: signal?.reason });

      try {
        if (this.#running) throw new Error('The Orchestration is already running.');
        this.#running = true;
        validate(arguments[0], 'object', false, `Invalid type for run first argument`);
        validate(arguments[1], 'object', false, `Invalid type for run second argument`);
        validate(functions, 'object', true, `Invalid type for functions`);
        validate(connections, 'array', true, `Invalid type for connections`);
        if(signal) {
          if(!(signal instanceof AbortSignal)) throw new Error('The provided signal must be an instance of AbortSignal.');
          signal.addEventListener('abort', abortHandler, { once: true });
          if (signal.aborted) {
            end(false, { state, error: signal.reason });
            return;
          }
        }

        // initialize listeners for every connection
        for (const [connectionIndex, connection] of connections.entries()) {
          validate(connection, 'object', true, `Invalid type for connection[${connectionIndex}]`);
          const fromList = connection.from ?? [];
          validate(fromList, 'array', true, `Invalid type for connection[${connectionIndex}].from`);
          if (fromList.length === 0) throw new Error(`The connection ${connectionIndex} from is an empty array.`);
          fromList.forEach((from, index)=>{
            validate(from, 'string', true, `Invalid type for connection[${connectionIndex}].from[${index}]`);
            if(!getFunction(from)) throw new Error(`Invalid function name in connection[${connectionIndex}].from[${index}].`);
            allFrom.add(from);
          });
          const toList = connection.to ?? [];
          validate(toList, 'array', true, `Invalid type for connection[${connectionIndex}].to`);
          toList.forEach((to, index)=>{
            validate(to, 'string', true, `Invalid type for connection[${connectionIndex}].to[${index}]`);
            if(!getFunction(to)) throw new Error(`Invalid function name in connection[${connectionIndex}].to[${index}].`);
            allTo.add(to);
          });

          validate(connection.transition, 'string', false, `Invalid type for connection[${connectionIndex}].transition`);

          listenAll(fromList.map(from=>`results.${from}`), async (/** @type {Array<any>} */fromResults) => {
            const from = [];
            for (const fromResult of fromResults) {
              if (fromResult.error)
                return;
              from.push(fromResult.result);
            }

            for (const from of fromList)
              delete state.results[from];

            let transitionResults = {
              to: from.map(obj=>[obj]), //when no transition is defined the output of the froms are gived as first argument input parameter for the to
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
            state.variables.global = transitionResults.global ?? state.variables.global;
            validate(state.variables.global, 'object', true, `Invalid type of global variable returned by the transition of connection ${connectionIndex}`);
            state.variables.locals[connectionIndex] = transitionResults.local ?? state.variables.locals[connectionIndex];
            validate(state.variables.locals[connectionIndex], 'object', true, `Invalid type of local variable returned by the transition of connection ${connectionIndex}`);
            if(toList.length > 0) {
              if (!Array.isArray(inputsList)) throw new Error(`The connection ${connectionIndex} transition returned "to" value must be an array.\nReturned: ${JSON.stringify(inputsList)}.`);
              if (inputsList.length != toList.length) throw new Error(`The connection ${connectionIndex} transition returned "to" value must be an array of the same length of the "connection.to" array (length=${toList.length}).\nReturned: ${JSON.stringify(inputsList)} (length=${inputsList.length}).`);
              for (let i=0; i<toList.length; i++) {
                const to = toList[i];
                const inputs = inputsList[i];
                if (inputs == null)
                  continue;
                if (!Array.isArray(inputs)) throw new Error(`The connection ${connectionIndex} transition returned "to" array value must contains only arrays of input parameters.\nReturned: ${JSON.stringify(inputs)}.`);
                runFunction(to, inputs);
              }
            } else {
              state.results['connection_' + connectionIndex] = { result: inputsList };
              this.dispatchEvent(new CustomEvent('state.change', { detail: { state: state }}));
            }
          });
        }

        // identify initial functions
        /** @type {Object<string, Array<any>>} */
        const inits = {};
        Object.keys(functions).forEach(key=>{
          validate(functions[key].args, 'array', false, `Invalid type for functions["${key}"].args`);
          validate(functions[key].ref, 'string', false, `Invalid type for functions["${key}"].ref`);
          validate(functions[key].throws, 'boolean', false, `Invalid type for functions["${key}"].throws`);
          validate(functions[key].inputsTransformation, 'string', false, `Invalid type for functions["${key}"].inputsTransformation`);
          validate(functions[key].outputTransformation, 'string', false, `Invalid type for functions["${key}"].outputTransformation`);
          if (!getFunction(key)) throw new Error(`Function ${key} not valid. ${functions[key].ref?'The provided ref do not point to a valid funciton.':'The parameter ref is not provided and the function name do not match any valid function.'}`);
          if (functions[key].args)
            inits[key] = functions[key].args;
        });

        //if user not provided initial inputs will automatically find functions that can start, passing no inputs
        if (Object.keys(inits).length === 0) {
          allFrom.forEach(from=>{
            if (!allTo.has(from) && !inits[from])
              inits[from] = [];
          });
        }

        const initialResultsFunctions = Object.keys(this.#initialState.results);
        if (initialResultsFunctions.length > 0) {
          // set internal state with provided initial values from setState
          state.results = this.#initialState.results;
          state.variables = this.#initialState.variables;
          if(state.variables.locals.length != connections.length) throw new Error(`The variables.locals provided by setState must be an array of the same lenght of the connections (${connections.length}). Provided array lenght: ${state.variables.locals.length}`);
          // dispatch all the provided function results
          for (const name of initialResultsFunctions) {
            if (!getFunction(name)) throw new Error(`The function ${name} of setState provided results do not exist.`);
            this.dispatchEvent(new CustomEvent(`results.${name}`, { detail: this.#initialState.results[name] }));
          }
        } else {
          //run the functions for which we have initial inputs
          for(const fnId of Object.keys(inits)) {
            runFunction(fnId, inits[fnId]);
          }
        }
        
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

function validate(/** @type {any} */value, /** @type {"undefined" | "boolean" | "number" | "string" | "object" | "function" | "symbol" | "bigint" | "array"} */type, /** @type {Boolean} */required = true, /** @type {string} */message = '') {
  if (value !== true && value !== false && ( (required && !value) || (value && type !== 'array' && typeof value !== type) || (value && type === 'array' && !Array.isArray(value) ) ) )
    throw new TypeError((message ? message + '. ' : '') + 'Expected ' + type + ' but provided ' + typeof value + ': ' + value);
}