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
     *      echo: echo=>echo
     *    },
     *    explicitInitsOnly: false
     * });
     */
    constructor({ functions, explicitInitsOnly }: {
        functions: Record<string, Function>;
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
    run_old({ functions, connections }?: {
        functions?: Record<string, {
            /**
             * Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
             */
            ref?: string | undefined;
            /**
             * When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
             */
            args?: Array<any> | undefined;
            /**
             * When true, errors thrown by the functions will throw and terminate the orchestration
             */
            throws?: boolean | undefined;
            /**
             * When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
             */
            inputsTransformation?: string | undefined;
            /**
             * When available must contain a JSONata expression to post-porcess the function output before being used in any connection
             */
            outputTransformation?: string | undefined;
        }> | undefined;
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
    /**
     * Start the Orchestrator
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
    start({ functions, connections }?: {
        functions?: Record<string, {
            /**
             * Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
             */
            ref?: string | undefined;
            /**
             * When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
             */
            args?: Array<any> | undefined;
            /**
             * When true, errors thrown by the functions will throw and terminate the orchestration
             */
            throws?: boolean | undefined;
            /**
             * When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
             */
            inputsTransformation?: string | undefined;
            /**
             * When available must contain a JSONata expression to post-porcess the function output before being used in any connection
             */
            outputTransformation?: string | undefined;
        }> | undefined;
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
    run({ functions, connections }?: {
        functions?: Record<string, {
            /**
             * Reference to the name of the function exposed in the Orchestrator instantiation. When not provided the function name is used.
             */
            ref?: string | undefined;
            /**
             * When available, will be used as input arguments for the function during its execution at the initialization of the orchestration
             */
            args?: Array<any> | undefined;
            /**
             * When true, errors thrown by the functions will throw and terminate the orchestration
             */
            throws?: boolean | undefined;
            /**
             * When available must contain a JSONata expression to pre-process the function inputs before being passed to the function
             */
            inputsTransformation?: string | undefined;
            /**
             * When available must contain a JSONata expression to post-porcess the function output before being used in any connection
             */
            outputTransformation?: string | undefined;
        }> | undefined;
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
