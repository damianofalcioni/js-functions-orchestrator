/**
 * Orchestrator for JS functions
 * @extends EventTarget
 */
export class Orchestrator extends EventTarget {
    /**
     * @typedef {Object} State
     * @property {Object} [variables] Object containing global and locals variables
     * @property {Record<string, any>} [variables.global] Object containing all the global variables (as keys) with their values, defined in the different connections transitions
     * @property {Array<Record<string, any>>} [variables.locals] Array of local variables for each connections defined in each connection transition
     * @property {Object} [finals]
     * @property {Record<string, Array<any>>} [finals.functions]
     * @property {Record<string, Array<any>>} [finals.events]
     * @property {Array<Array<any>|undefined>} [finals.connections]
     * @property {Record<string, Array<any>>} [errors]
     * @property {Array<Record<string, Array<any>>>} [waitings]
     * @property {Array<{inputs:Array<any>, id:number|string}>} [runnings]
     */
    /**
    {
      finals: {
        functions: {
          fn1:[any]
        },
        events: {
          ev1: [any]
        },
        connections: [,[],]
      },
      errors: {
        fn1: []
      },
      waitings: [{
        event.fn: [any]
      }, {...}],
      runnings: [{
        id: 'fn1',
        inputs: []
      }]
    }
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
    constructor(config?: {
        functions?: Record<string, Function>;
    });
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
             * When available must contain a JSONata expression to post-process the function output before being used in any connection
             */
            outputTransformation?: string;
        }>;
        events?: Record<string, {
            /**
             * Reference to the name of the event to be listened. When not provided the event name is used
             */
            ref?: string;
            /**
             * When available, will set the once attribute at event listening
             */
            once?: boolean;
        }>;
        connections?: Array<{
            /**
             * The list of the connections from where the data is coming from
             */
            from?: Array<string>;
            /**
             * The JSONata to process the data
             */
            transition?: string;
            /**
             * The list of the connections to where the data is going to
             */
            to?: Array<string>;
        }>;
    }, options?: {
        /**
         * An optional AbortSignal to abort the execution
         */
        signal?: AbortSignal;
    }, state?: {
        /**
         * Object containing global and locals variables
         */
        variables?: {
            global?: Record<string, any>;
            locals?: Array<Record<string, any>>;
        };
        finals?: {
            functions?: Record<string, Array<any>>;
            events?: Record<string, Array<any>>;
            connections?: Array<Array<any> | undefined>;
        };
        errors?: Record<string, Array<any>>;
        waitings?: Array<Record<string, Array<any>>>;
        runnings?: Array<{
            inputs: Array<any>;
            id: number | string;
        }>;
    }): Promise<{
        state: {
            /**
             * Object containing global and locals variables
             */
            variables?: {
                global?: Record<string, any>;
                locals?: Array<Record<string, any>>;
            };
            finals?: {
                functions?: Record<string, Array<any>>;
                events?: Record<string, Array<any>>;
                connections?: Array<Array<any> | undefined>;
            };
            errors?: Record<string, Array<any>>;
            waitings?: Array<Record<string, Array<any>>>;
            runnings?: Array<{
                inputs: Array<any>;
                id: number | string;
            }>;
        };
    }>;
    #private;
}
