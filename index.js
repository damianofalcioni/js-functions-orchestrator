import jsonata from 'jsonata';

/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
  /** @type {Object<string, any>} */
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
   *      fn1: async a=>a,
   *      fn2: async a=>a
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
   * @typedef {Object} Function An optional definition of functions to use in the different Connections with the following properties:
   * @property {string} ref Reference to the name of the function exposed in the Orchestrator instantiation
   * @property {Array<any>|undefined} [args] When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
   * @property {Boolean|undefined} [catch] When true the error thrown by the functions will be catched and not terminate the orchestration
   * @property {string|undefined} [inputsTransformation] When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
   * @property {string|undefined} [outputTransformation] When available must contain a JSONata expression to post-porcess the function output before being used in any connection
   * /

  /**
   * @typedef {Object} Connection The connections between the services provided as an array of objects with the following properties:
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
   * @param {Object<string, string>|undefined} [config.aliases] A JSON object containing as key an alias name for the function name provided as value
   * @param {Object<string, Array<any>>|undefined} [config.inits] A JSON object containing as key the function name and as value an array of parameters to use as input for the funciton
   * @param {Connection[]|undefined} [config.connections] The connections between the services provided as an array of objects with the following properties:
   * - from:       The list of the connections from where the data is coming from (string[])
   * - transition: The JSONata to process the data  (optional, string)
   * - to:         The list of the connections to where the data is going to  (optional, string[])
   * @returns {Promise<Output>} A promise that resolves with the results of the Orchestrator
   * @example
   *  await run({
   *    aliases: {
   *      fn3: 'fn1'
   *    },
   *    inits: {
   *      fn1: ['Hello']
   *    },
   *    connections: [{
   *      from: ['fn1'],
   *      transition: '{"global":$.global, "local":$.local, "to":[[$.from[0] & " World"]]}',
   *      to: ['fn2']
   *    }, {
   *      from: ['fn2'],
   *      to: []
   *    }]
   *  });
   *
   * output:
   *  {
   *    results: { connection_1: [ 'Hello World' ] },
   *    variables: { global: {}, locals: [ {}, {} ] }
   *  }
   */

  async run ({
    aliases = {},
    inits = {},
    connections = []
  } = {}) {
    
    if (this.#explicitInitsOnly && Object.keys(inits).length === 0) throw new Error('When "explicitInitsOnly" is true, "inits" cannot be empty.');
    const runFunction = (/** @type {string} */ name, /** @type {Array<any>} */ args) => {
      const fn = aliases[name] ? this.#functions[aliases[name]] : this.#functions[name];
      if (!fn) throw new Error(`Function or Alias ${name} not existing.`);
      return Promise.resolve(fn(...args));
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

    if (!this.#state.userProvided) { //userProvided=true only when the user setState. In this case we have to resume execution, so without initialization
      this.#state.results = {};
      //run the functions for which we have initial inputs
      for(const fnId of Object.keys(inits)) {
        if (!Array.isArray(inits[fnId])) throw new Error(`The "inits.${fnId}" value must be an array.`);
        this.#state.results[fnId] = runFunction(fnId, inits[fnId]);
        this.dispatchEvent(new CustomEvent('state.change', { detail: { state: this.#state }}));
      }

      //check for every connection if all the from outputs are availables
      this.#state.variables = {
        global: {},
        locals: new Array(connections.length).fill(null).map(() => ({}))
      };
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
          for (const from of fromList) {
            if (!Object.hasOwn(this.#state.results, from)) {
              canStart = false;
              break;
            } else {
              outputsAwaitList.push(this.#state.results[from]);
            }
          }
          if (canStart) {
            //wait all the outputs of the froms to be resolved and apply placeholders for symbols and functions
            const outputsList = await Promise.all(outputsAwaitList);
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
                this.dispatchEvent(new CustomEvent('state.change', { detail: { state: this.#state }}));
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
      this.#state.results[fnId] = await this.#state.results[fnId];
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