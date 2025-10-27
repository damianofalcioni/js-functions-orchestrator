export class Orchestrator {
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
    constructor({ functions, explicitItisOnly }?: {
        functions?: Record<string, any>;
        explicitItisOnly?: boolean;
    });
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
    run({ inits, connections }?: {
        inits?: {
            [x: string]: any;
        };
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
        }[];
    }): Promise<{
        results: {
            [x: string]: any;
        };
        variables: {
            global: {
                [x: string]: any;
            };
            locals: Array<any>;
        };
    }>;
    #private;
}
