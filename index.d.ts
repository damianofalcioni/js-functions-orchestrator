/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
    /**
     * @typedef {Object} State
     * @property {Object<string, Result>} results Object containing the results or errors (as values) of the executed functions (as keys)
     * @property {Object} variables Object containing global and locals variables
     * @property {Object<string, any>} variables.global Object containing all the global variables (as key) with their value, defined in the different connections transitions
     * @property {Array<Object<string, any>>} variables.locals Array of local variables for each connections defined in each connection transition
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
     * @example
     *  new Orchestrator({
     *    functions: {
     *      echo: echo=>echo
     *    }
     * });
     */
    constructor(config?: {
        functions?: Record<string, Function>;
    });
    /**
     * @typedef {Object} FunctionConfig An optional definition of function to use in the different Connections with the following properties:
     * @property {string} [ref] Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
     * @property {Array<any>} [args] When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
     * @property {Boolean} [throws] When true, errors thrown by the functions will throw and terminate the orchestration
     * @property {string} [inputsTransformation] When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
     * @property {string} [outputTransformation] When available must contain a JSONata expression to post-porcess the function output before being used in any connection
     */
    /**
   * @typedef {Object} EventConfig An optional definition of event to use in the different Connections with the following properties:
   * @property {string} [ref] Reference to the name of the event to be listened. When not provided the event name is used.
   * @property {boolean} [once] When available, will set the once attribute at event listening
   */
    /**
     * @typedef {Object} ConnectionConfig The connections between the services provided as an array of objects with the following properties:
     * @property {string[]} [from] The list of the connections from where the data is coming from
     * @property {string} [transition] The JSONata to process the data
     * @property {string[]} [to] The list of the connections to where the data is going to
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
     * - {Array<any>} [args]: When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
     * - {Boolean} [throws]: When true, errors thrown by the functions will throw and terminate the orchestration
     * - {string} [inputsTransformation]: When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
     * - {string} [outputTransformation]: When available must contain a JSONata expression to post-porcess the function output before being used in any connection
     * @param {ConnectionConfig[]} [config.connections] The connections between the services provided as an array of objects with the following properties:
     * - {string[]} [from]: The list of the connections from where the data is coming from
     * - {string} [transition]: The JSONata to process the data
     * - {string[]} [to]: The list of the connections to where the data is going to
     * @param {OptionsConfig} [options] Configurable options with the following properties:
     * - {AbortSignal} [signal]: An optional AbortSignal to abort the execution
     * @param {State} [state] An optional reference to a state that will be used as starting state for the execution and updated ongoing. State must be composed of the following properties:
     * - {Object<string, Result>} results: Object cantaining the results or errors (as values) of the executed functions (as keys)
     * - {Object} variables: Object containing global and locals variables
     * - {Object<string, any>} variables.global: Object containing all the global variables (as key) with their value, defined in the different connections transitions
     * - {Array<Object<string, any>>} variables.locals: Array of local variables for each connections defined in each connection transition
     * @returns {Promise<{state:State}>} The function always return a promise that rejects in case of errors or resolves with the state of the Orchestrator composed of the following properties:
     * - {Object<string, Result>} results: Object cantaining the results or errors (as values) of the executed functions (as keys)
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
    run(config?: {
        functions?: Record<string, {
            /**
             * Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
             */
            ref?: string;
            /**
             * When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
             */
            args?: Array<any>;
            /**
             * When true, errors thrown by the functions will throw and terminate the orchestration
             */
            throws?: boolean;
            /**
             * When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
             */
            inputsTransformation?: string;
            /**
             * When available must contain a JSONata expression to post-porcess the function output before being used in any connection
             */
            outputTransformation?: string;
        }>;
        connections?: {
            /**
             * The list of the connections from where the data is coming from
             */
            from?: string[];
            /**
             * The JSONata to process the data
             */
            transition?: string;
            /**
             * The list of the connections to where the data is going to
             */
            to?: string[];
        }[];
    }, options?: {
        /**
         * An optional AbortSignal to abort the execution
         */
        signal?: AbortSignal;
    }, state?: {
        /**
         * Object containing the results or errors (as values) of the executed functions (as keys)
         */
        results: {
            [x: string]: {
                /**
                 * The thrown error, if any
                 */
                error?: any;
                /**
                 * The function result, when no error is thrown: any value
                 */
                result?: any;
            };
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
    }): Promise<{
        state: {
            /**
             * Object containing the results or errors (as values) of the executed functions (as keys)
             */
            results: {
                [x: string]: {
                    /**
                     * The thrown error, if any
                     */
                    error?: any;
                    /**
                     * The function result, when no error is thrown: any value
                     */
                    result?: any;
                };
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
        };
    }>;
    #private;
}
