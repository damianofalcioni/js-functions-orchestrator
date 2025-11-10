import jsonata from 'jsonata';

/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
  /** @type {Object<string, function>} */
  #functions = {};

  #explicitInitsOnly = false;
  
  /**
   * @typedef {Object} State
   * @property {Object<string, any>} results Object cantaining the results (as values) of the executed but not consumed functions (as keys)
   * @property {Object} variables Object containing global and locals variables
   * @property {Object<string, any>} variables.global Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * @property {Array<Object<string, any>>} variables.locals Array of local variables for each connections defined in each connection transition
   * @property {Number} connectionIndex The current index of the connections array
   * @property {boolean|undefined} [userProvided] Needed only internally to evaluate a user provided state by setState
   */
  /** @type {State} */
  #state = {
    results: {},
    variables: {
      global: {},
      locals: []
    },
    connectionIndex: 0,
    userProvided: false
  };

  /**
   * Constructor
   * @param {Object} config
   * @param {Record<string, function>} config.functions A JSON object containing as key the function name and as value the function
   * @param {boolean|undefined} [config.explicitInitsOnly] When true only the user specified init functions are used. When false initial functions will be automatically discovered. (Default false)
   * @example
   *  new Orchestrator({
   *    functions: {
   *      echo: echo=>echo
   *    },
   *    explicitInitsOnly: false
   * });
   */
  constructor ({ functions, explicitInitsOnly = false }) {
    super();
    this.#functions = functions;
    this.#explicitInitsOnly = explicitInitsOnly;
  }

  /**
   * Set the current orchestration status in order to resume an orchestration or start an orchestration at a specific point
   * @param {State} state The orchestration state
   */
  setState (state) {
    this.#state = state;
    this.#state.userProvided = true;
  }

  /**
   * @typedef {Object} FunctionConfig An optional definition of functions to use in the different Connections with the following properties:
   * @property {string|undefined} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
   * @property {Array<any>|undefined} [args] When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
   * @property {Boolean|undefined} [throws] When true, errors thrown by the functions will throw and terminate the orchestration
   * @property {string|undefined} [inputsTransformation] When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * @property {string|undefined} [outputTransformation] When available must contain a JSONata expression to post-porcess the function output before being used in any connection
   * /

  /**
   * @typedef {Object} ConnectionConfig The connections between the services provided as an array of objects with the following properties:
   * @property {string[]} from The list of the connections from where the data is coming from
   * @property {string|undefined} [transition] The JSONata to process the data
   * @property {string[]|undefined} [to] The list of the connections to where the data is going to
   */

  /**
   * @typedef {Object} Output
   * @property {Object<string, any>} results Object cantaining the results (as values) of the executed but not consumed functions (as keys)
   * @property {Object} variables Object containing global and locals variables
   * @property {Object<string, any>} variables.global Object containing all the global variables (as key) with their value, defined in the different connections transitions
   * @property {Array<Object<string, any>>} variables.locals Array of local variables for each connections defined in each connection transition
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
   * @returns {Promise<Output>} A promise that resolves with the results of the Orchestrator composed of the following properties:
   * - {Object<string, any>} results: Object cantaining the results (as values) of the executed but not consumed functions (as keys)
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
   *    results: { fn3: 'Hello World' },
   *    variables: { global: {}, locals: [ {}, {} ] }
   *  }
   */

  async run ({
    functions = {},
    connections = []
  } = {}) {
    /** @type {Object<string, Array<any>>} */
    const inits = {};
    Object.keys(functions).forEach(key=>{
      if (functions[key].args)
        inits[key] = functions[key].args;
    });
    if (this.#explicitInitsOnly && Object.keys(inits).length === 0) throw new Error('When "explicitInitsOnly" is true, args must be provided to some functions.');
    const runFunction = (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
      const fn = functions[name]?.ref ? this.#functions[functions[name].ref] : this.#functions[name];
      if (!fn) throw new Error(`Function ${name} not existing.`);
      return (async () => {
        let res = null;
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
          res = {
            result: await fn(...args)
          };
        }catch(e) {
          // @ts-ignore
          res = { error: e, message: e?.message ? e.message : null };
          this.dispatchEvent(new CustomEvent('errors', { detail: res }));
          this.dispatchEvent(new CustomEvent(`errors.${name}`, { detail: res }));
          if (functions[name]?.throws)
            throw e;
        }
        if (res.result && functions[name]?.outputTransformation) {
          try {
            res.result = await executeJSONata(functions[name]?.outputTransformation, res.result);
          } catch (error) {
            // @ts-ignore
            throw new Error(`Function ${name} outputTransformation: ${error.message}`);
          }
        }
        this.#state.results[name] = res;
        this.dispatchEvent(new CustomEvent('state.change', { detail: { state: this.#state }}));
        return res;
      })(); //sync IIFE, without awaiting fn
    };

    if (!this.#explicitInitsOnly) {
      /** @type {Object<string, any>} */
      const autoInits = {};
      for (const connection of connections) {
        for(const from of connection.from ?? []) {
          autoInits[from] = [];
        }
        for(const to of connection.to ?? []) {
          if (autoInits[to]) {
            delete autoInits[to];
          }
        }
      }
      for(const fnId of Object.keys(autoInits)) {
        if (!inits[fnId])
          inits[fnId] = autoInits[fnId];
      }
    }

    if (!this.#state.userProvided) { //userProvided=true only when the user setState. In this case we have to resume execution, so skip initialization
      this.#state.results = {};
      this.#state.variables = {
        global: {},
        locals: new Array(connections.length).fill(null).map(() => ({}))
      };
      //run the functions for which we have initial inputs
      for(const fnId of Object.keys(inits)) {
        if (!Array.isArray(inits[fnId])) throw new Error(`The "args" value for function "${fnId}", must be an array.`);
        this.#state.results[fnId] = runFunction(fnId, inits[fnId]);
      }
    }
    
    const connectionsCheck = async () => {
      let canContinue;
      do {
        canContinue = false;
        for (this.#state.connectionIndex = this.#state.userProvided?this.#state.connectionIndex:0; this.#state.connectionIndex < connections.length; this.#state.connectionIndex++) {
          delete this.#state.userProvided;
          const connectionIndex = this.#state.connectionIndex;
          const connection = connections[connectionIndex];
          let canStart = true;
          const outputsAwaitList = [];
          const fromList = connection.from ?? [];
          if (fromList.length === 0) throw new Error(`The connection ${connectionIndex} from is an empty array.\nConnection: ${JSON.stringify(connection)}`);
          //check for every connection if all the from outputs are availables
          for (const from of fromList) {
            if (!Object.hasOwn(this.#state.results, from)) {
              canStart = false;
              break;
            } else {
              outputsAwaitList.push(this.#state.results[from]);
            }
          }
          // check first errors in fulfilled functions results to potentially avoid awaiting later
          if (canStart) {
            for (const outputAwait of outputsAwaitList) {
              if(!(await isPending(outputAwait))) {  //no waiting here
                const output = await outputAwait; //no waiting here
                if (output.error)
                  canStart = false;
              }
            }
          }
          const outputsList = [];
          if (canStart) {
            //wait all the outputs of the froms to be resolved
            for (const outputAwait of outputsAwaitList) {
              const output = await outputAwait;
              if (output.error)
                  canStart = false;
              else
                outputsList.push(output.result ? output.result : output); //when results are provided by setState are without result
            }
          }
          if (canStart) {
            //remove all the outputs of the froms
            for (const from of fromList) {
              delete this.#state.results[from];
            }
            //we process all the outputs generating all the to inputs and call the execution of all the to where the processed inputs are not null
            canContinue = true;
            const toList = connection.to ?? [];
            let transitionResults = {
              to: outputsList.map(obj=>[obj]), //when no transition is defined the output of the froms are gived as first argument input parameter for the to
              global: this.#state.variables.global,
              local: this.#state.variables.locals[connectionIndex]
            };
            if (connection.transition) {
              try {
                const transitionInput = { 
                  from: outputsList, 
                  global: this.#state.variables.global, 
                  local: this.#state.variables.locals[connectionIndex]
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
            this.#state.variables.global = transitionResults.global ?? this.#state.variables.global;
            this.#state.variables.locals[connectionIndex] = transitionResults.local ?? this.#state.variables.locals[connectionIndex];
            if(toList.length > 0) {
              if (!Array.isArray(inputsList)) throw new Error(`The transition returned "to" value must be an array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
              if (inputsList.length != toList.length) throw new Error(`The transition returned "to" value must be an array of the same length of the "connection.to" array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
              for (let i=0; i<toList.length; i++) {
                const to = toList[i];
                const inputs = inputsList[i];
                if (inputs == null)
                  continue;
                if (!Array.isArray(inputs)) throw new Error(`The transition returned "to" array value must contains only arrays of input parameters.\nReturned: ${JSON.stringify(inputs)}\nConnection: ${JSON.stringify(connection)}`);
                this.#state.results[to] = runFunction(to, inputs);
              }
            } else {
              this.#state.results['connection_' + connectionIndex] = Promise.resolve(inputsList);
              this.dispatchEvent(new CustomEvent('state.change', { detail: { state: this.#state }}));
            }
          }
        }
        //will be done until no additional executions have been done
      } while (canContinue);
      this.#state.connectionIndex = 0;
    };

    await connectionsCheck();

    //wait for all the results to be resolved
    for(const fnId of Object.keys(this.#state.results)) {
      const output = await this.#state.results[fnId];
      this.#state.results[fnId] = output.result ? output.result : output;
    }
    this.dispatchEvent(new CustomEvent('success', { detail: { state: this.#state }}));
    return {
      results: this.#state.results,
      variables: this.#state.variables
    };
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

async function isPending(/** @type {Promise<any>} */ p) {
  const t = {};
  const v = await Promise.race([p, t])
  return v === t;
}