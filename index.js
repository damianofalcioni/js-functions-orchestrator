import jsonata from 'jsonata';

/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
  /** @type {Object<string, Function>} */
  #functions = {};

  #explicitInitsOnly = false;
  
  /**
   * @typedef {Object} State
   * @property {Object<string, ErrorResults|ResultResults|ConnectionResults>} results Object containing the results or errors (as values) of the executed functions (as keys)
   * @property {Object} variables Object containing global and locals variables
   * @property {Object<string, any>} variables.global Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * @property {Array<Object<string, any>>} variables.locals Array of local variables for each connections defined in each connection transition
   */

  /**
   * @typedef {Object} ErrorResults
   * @property {any} error The thrown error
   * @property {string|null} message The message when available in error.message or null
   */

  /**
   * @typedef {Object} ResultResults
   * @property {any} result The function result: any value
   */

  /**
   * @typedef {Object} ConnectionResults
   * @property {Array<Array<any>>} result The connection result: An array of input arguments
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
   * @param {boolean|undefined} [config.explicitInitsOnly] When true only the user specified init functions are used. When false initial functions will be automatically discovered. (Default false)
   * @example
   *  new Orchestrator({
   *    functions: {
   *      echo: echo=>echo
   *    },
   *    explicitInitsOnly: false
   * });
   */
  constructor ({ functions = {}, explicitInitsOnly = false }) {
    super();
    this.#functions = functions;
    this.#explicitInitsOnly = explicitInitsOnly;
  }

  /**
   * Set the current orchestration status in order to resume an orchestration or start an orchestration at a specific point
   * @param {State} state The orchestration state
   */
  setState (state) {
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
   * @returns {Promise<State>} A promise that resolves with the results of the Orchestrator composed of the following properties:
   * - {Object<string, ErrorResults|ResultResults|ConnectionResults>} results: Object cantaining the results or errors (as values) of the executed functions (as keys)
   * - {Object} variables: Object containing global and locals variables
   * - {Object<string, any>} variables.global: Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * - {Array<Object<string, any>>} variables.locals: Array of local variables for each connections defined in each connection transition
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
   *    results: { fn3: { result: 'Hello World' } },
   *    variables: { global: {}, locals: [ {}, {} ] }
   *  }
   */

  run ({
    functions = {},
    connections = []
  } = {}) {
    const {promise, resolve, reject} = Promise.withResolvers();
    /** @type {State} */
    const state = {
      results: {},
      variables: {
        global: {},
        locals: []
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
            end(false, error);
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
    };

    const end = (/** @type {Boolean}*/ok, /** @type {any}*/data)=> {
      clearListeners();
      if(ok) {
        this.dispatchEvent(new CustomEvent('success', { detail: { state }}));
        resolve(data);
      } else {
        reject(data); //TODO: publish error or keep only function publishing it?
      }
    };

    const checkTerminate = () => {
      if (activeFunctions.size === 0 && activeConnections.size === 0)
        end(true, state);
    };

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
        end(false, error);
      });
    };

    const execFunction = async (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
      const fn = functions[name]?.ref ? this.#functions[functions[name].ref] : this.#functions[name];
      if (!fn) throw new Error(`Function ${name} not existing.`);
      let ret = null;
      if (functions[name]?.inputsTransformation) {
        try {
          args = await executeJSONata(functions[name]?.inputsTransformation, args);
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
      } catch(e) {
        // @ts-ignore
        ret = { error: e, message: e?.message ? e.message : null };
        this.dispatchEvent(new CustomEvent('errors', { detail: { [name]: ret }}));
        this.dispatchEvent(new CustomEvent(`errors.${name}`, { detail: ret }));
        if (functions[name]?.throws)
          throw e;
      }
      if (ret.result && functions[name]?.outputTransformation) {
        try {
          ret.result = await executeJSONata(functions[name]?.outputTransformation, ret.result);
        } catch (error) {
          // @ts-ignore
          throw new Error(`Function ${name} outputTransformation: ${error.message}`);
        }
      }
      return ret;
    };

    // initialize listeners for every connection
    for (const [connectionIndex, connection] of connections.entries()) {
      const fromList = connection.from ?? [];
      if (fromList.length === 0) throw new Error(`The connection ${connectionIndex} from is an empty array.\nConnection: ${JSON.stringify(connection)}`);
      fromList.forEach(from=>allFrom.add(from));
      const toList = connection.to ?? [];
      toList.forEach(to=>allTo.add(to));
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
            transitionResults = await executeJSONata(connection.transition, transitionInput);
            //console.dir(transitionResults, {depth: null});
          } catch(error) {
            // @ts-ignore
            throw new Error(`Connection ${connectionIndex} transition: ${error.message}`);
          }
        }
        const inputsList = transitionResults.to;
        state.variables.global = transitionResults.global ?? state.variables.global;
        state.variables.locals[connectionIndex] = transitionResults.local ?? state.variables.locals[connectionIndex];
        if(toList.length > 0) {
          if (!Array.isArray(inputsList)) throw new Error(`The transition returned "to" value must be an array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
          if (inputsList.length != toList.length) throw new Error(`The transition returned "to" value must be an array of the same length of the "connection.to" array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
          for (let i=0; i<toList.length; i++) {
            const to = toList[i];
            const inputs = inputsList[i];
            if (inputs == null)
              continue;
            if (!Array.isArray(inputs)) throw new Error(`The transition returned "to" array value must contains only arrays of input parameters.\nReturned: ${JSON.stringify(inputs)}\nConnection: ${JSON.stringify(connection)}`);
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
      if (functions[key].args)
        inits[key] = functions[key].args;
    });
    if (this.#explicitInitsOnly && Object.keys(inits).length === 0) throw new Error('When "explicitInitsOnly" is true, args must be provided to some functions.');

    if (!this.#explicitInitsOnly) {
      allFrom.forEach(from=>{
        if (!allTo.has(from) && !inits[from])
          inits[from] = [];
      });
    }

    const initialResultsFunctions = Object.keys(this.#initialState.results);
    const variablesEmpty = {
      global: {},
      locals: new Array(connections.length).fill(null).map(() => ({}))
    };
    if (initialResultsFunctions.length > 0) {
      // set internal state with provided initial values from setState
      state.results = this.#initialState.results;
      state.variables = this.#initialState.variables ?? variablesEmpty;
      // dispatch all the provided function results
      for (const name of initialResultsFunctions)
        this.dispatchEvent(new CustomEvent(`results.${name}`, { detail: this.#initialState.results[name] }));
    } else {
      // reset internal state
      state.results = {};
      state.variables = variablesEmpty;
      //run the functions for which we have initial inputs
      for(const fnId of Object.keys(inits)) {
        if (!Array.isArray(inits[fnId])) throw new Error(`The "args" value for function "${fnId}", must be an array.`);
        runFunction(fnId, inits[fnId]);
      }
    }

    return promise;
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