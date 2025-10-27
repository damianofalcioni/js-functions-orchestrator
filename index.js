// @ts-check
import jsonata from 'jsonata';

export class Orchestrator {
  /** @type {Object<string, any>} */
  #functions = {};

  #explicitItisOnly = false;
  
  /**
   * @typedef {Object} State
   * @property {Object<string, any>} results 
   * @property {Object} variables
   * @property {Object<string, any>} variables.global
   * @property {Array<any>} variables.locals
   */
  /** @type {State} */
  #state = {
    results: {},
    variables: {
      global: {},
      locals: []
    }
  };

  /**
   * @typedef {Object} StateHandler
   * @property {function|null} set 
   * @property {function|null} get
   */
  /** @type {StateHandler} */
  // @ts-ignore
  #stateHandler = {
    set: null,
    get: null
  };

  /**
   * Constructor
   * @param {Object} [config]
   * @param {Record<string, any>} [config.functions] A JSON object containing as key the function name and as value the function
   * @param {boolean} [config.explicitItisOnly] When true only the user specified init functions are used. When false initial functions will be automatically discovered. (Default false)
   * @example
   *  new Orchestrator({
   *    functions: {
   *      fn1: async a=>a,
   *      fn2: async a=>a
   *    },
   *    explicitItisOnly: false
   * });
   */
  constructor ({ functions = {}, explicitItisOnly = false } = {}) {
    this.#functions = functions;
    this.#explicitItisOnly = explicitItisOnly;
  }

  /*
  stateHandler ({
    setState=null,
    getState=null
  }) {
    this.#stateHandler.set = setState;
    this.#stateHandler.get = getState;
  }*/

  /**
   * @typedef {Object} Connection The connections between the services provided as an array of objects with the following properties:
   * @property {string[]} from The list of the connections from where the data is coming from
   * @property {string|undefined} [transition] The JSONata to process the data
   * @property {string[]|undefined} [to] The list of the connections to where the data is going to
   */

  /**
   * Run the Orchestrator
   * @param {Object} [config]
   * @param {Object<string, any>} [config.inits] A JSON object containing as key the function name and as value an array of parameters to use as input for the funciton
   * @param {Connection[]} [config.connections] The connections between the services provided as an array of objects with the following properties:
   * - from:       The list of the connections from where the data is coming from (string[])
   * - transition: The JSONata to process the data  (optional, string)
   * - to:         The list of the connections to where the data is going to  (optional, string[])
   * @returns {Promise<State>} A promise that resolves with the results of the Orchestrator
   * @example
   *  await run({
   *    inits: {
   *      fn1: ["Hello"]
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
    inits = {},
    connections = []
  } = {}) {
    this.#state.results = {};

    if (this.#explicitItisOnly && Object.keys(inits).length === 0) throw new Error('When "explicitItisOnly" is true, "inits" cannot be empty.');

    if (!this.#explicitItisOnly) {
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

    //run the functions for which we have initial inputs
    for(const fnId of Object.keys(inits)) {
      if (this.#functions[fnId]) {
        this.#state.results[fnId] = Promise.resolve(this.#functions[fnId](...inits[fnId]));
      }
    }

    //check for every connection if all the from outputs are availables
    this.#state.variables = {
      global: {},
      locals: new Array(connections.length).fill(null).map(() => ({}))
    };
    const connectionsCheck = async () => {
      let canContinue;
      do {
        canContinue = false;
        for (let connectionIndex = 0; connectionIndex < connections.length; connectionIndex++) {
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
            //wait all the outputs of the froms to be resolved
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
                transitionResults = await jsonata(connection.transition).evaluate(transitionInput);
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
              if (!Array.isArray(inputsList)) throw new Error(`The transition returned value must be an array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
              if (inputsList.length != toList.length) throw new Error(`The transition returned value must be an array of the same length of the connection.to array.\nReturned: ${JSON.stringify(inputsList)}\nConnection: ${JSON.stringify(connection)}`);
              for (let i=0; i<toList.length; i++) {
                const to = toList[i];
                const inputs = inputsList[i];
                if (inputs == null)
                  continue;
                this.#state.results[to] = Promise.resolve(this.#functions?.[to](...inputs));
              }
            } else {
              this.#state.results['connection_' + connectionIndex] = inputsList;
            }
          }
        }
        //will be done until no additional executions have been done
      } while (canContinue);
    };

    await connectionsCheck();

    //wait for all the results to be resolved
    for(const fnId of Object.keys(this.#state.results)) {
      this.#state.results[fnId] = await this.#state.results[fnId];
    }
    return {
      results: this.#state.results,
      variables: this.#state.variables
    };
  }
}