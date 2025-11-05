/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
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
    constructor({ functions, explicitInitsOnly }: {
        functions: Record<string, globalThis.Function>;
        explicitInitsOnly?: boolean | undefined;
    });
    /**
     * Set the current orchestration status in order to resume an orchestration or start an orchestration at a specific point
     * @param {State} state The orchestration state
     */
    setState(state: {
        /**
         * Object cantaining the results (as values) of the executed but not consumed functions (as keys)
         */
        results: {
            [x: string]: any;
        };
        /**
         * Object containing global and locals variables
         */
        variables: {
            global: {
                [x: string]: any;
            };
            locals: Array<{
                [x: string]: any;
            }>;
        };
        /**
         * The current index of the connections array
         */
        connectionIndex: number;
        /**
         * Needed only internally to evaluate a user provided state by setState
         */
        userProvided?: boolean | undefined;
    }): void;
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
    run({ aliases, inits, connections }?: {
        aliases?: {
            [x: string]: string;
        } | undefined;
        inits?: {
            [x: string]: Array<any>;
        } | undefined;
        connections?: {
            /**
             * The list of the connections from where the data is coming from
             */
            from: string[];
            /**
             * The JSONata to process the data
             */
            transition?: string | undefined;
            /**
             * The list of the connections to where the data is going to
             */
            to?: string[] | undefined;
        }[] | undefined;
    }): Promise<{
        /**
         * Object cantaining the results (as values) of the executed but not consumed functions (as keys)
         */
        results: {
            [x: string]: any;
        };
        /**
         * Object containing global and locals variables
         */
        variables: {
            global: {
                [x: string]: any;
            };
            locals: Array<{
                [x: string]: any;
            }>;
        };
    }>;
    #private;
}
