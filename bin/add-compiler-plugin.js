// https://webpack.js.org/api/compiler#event-hooks
const tapableEventNames = {
    'entry-option':           'entryOption',
    'after-plugins':          'afterPlugins',
    'after-resolvers':        'afterResolvers',
    'environment':            'environment',
    'after-environment':      'afterEnvironment',
    'before-run':             'beforeRun',
    'run':                    'run',
    'watch-run':              'watchRun',
    'normal-module-factory':  'normalModuleFactory',
    'context-module-factory': 'contextModuleFactory',
    'before-compile':         'beforeCompile',
    'compile':                'compile',
    'this-compilation':       'thisCompilation',
    'compilation':            'compilation',
    'make':                   'make',
    'after-compile':          'afterCompile',
    'should-emit':            'shouldEmit',
    'need-additional-pass':   'needAdditionalPass',
    'emit':                   'emit',
    'after-emit':             'afterEmit',
    'done':                   'done',
    'failed':                 'failed',
    'invalid':                'invalid',
    'watch-close':            'watchClose'
}

/**
 * Tap into the specified compiler hook, using the new Webpack 4 API.
 *
 * For more information, see:
 *
 * https://github.com/webpack/tapable
 * https://medium.com/webpack/webpack-4-migration-guide-for-plugins-loaders-20a79b927202
 * https://blog.johnnyreilly.com/2018/01/finding-webpack-4-use-map.html
 *
 * @param {Object}   compiler   Webpack Compiler instance, as returned by the
 *                              `webpack` runner when no callback is specified.
 * @param {String}   hookName   Name of the hook to tap into, in lower camel
 *                              case, as per the new ".hooks" API.
 * @param {Function} pluginFunc Event handler function.   
 */
function tapCompilerHook (compiler, hookName, pluginFunc) {
    const eventHook = compiler.hooks[hookName]
    switch (hookName) {
        case 'beforeRun':
        case 'run':
        case 'watchRun':
        case 'beforeCompile':
        case 'make':
        case 'afterCompile':
        case 'emit':
        case 'afterEmit':
            eventHook.tapAsync('WebpackDevRunner', pluginFunc)
            break

        default:
            eventHook.tap('WebpackDevRunner', pluginFunc)
            break
    }
}

/**
 * Backwards compatible webpack plugin interface wrapper. Single event version.
 *
 * @param {Object}   compiler   Webpack Compiler instance, as returned by the
 *                              `webpack` runner when no callback is specified.
 * @param {String}   eventName  Name of the event to tap into, in kebab case,
 *                              as per the legacy plugin API.
 * @param {Function} pluginFunc Event handler function.   
 */
function addCompilerPlugin (compiler, eventName, pluginFunc) {
    if (compiler.hooks) {
        // Use the ".hooks" API if it exists (webpack 4)
        if (!tapableEventNames[eventName]) {
            throw new Error(`Event type "${eventName} does not exist!"`)
        }
        tapCompilerHook(compiler, tapableEventNames[eventName], pluginFunc)
    } else {
        // Fall-back to the legacy plugin API
        compiler.plugin(eventName, pluginFunc)
    }
}

/**
 * Backwards compatible webpack plugin interface wrapper.
 *
 * @param {Object}       compiler   Webpack Compiler instance, as returned by
 *                                  the `webpack` runner when no callback is
 *                                  specified.
 * @param {String|Array} eventNames Name(s) of the event(s) to tap into, in
 *                                  kebab case, as per the legacy plugin API.
 * @param {Function}     pluginFunc Event handler function.   
 */
module.exports = function (compiler, eventNames, pluginFunc) {
    if (typeof eventNames === 'string') {
        eventNames = Array(eventNames)
    }
    if (!Array.isArray(eventNames)) {
        throw new Error('Wrong type for "eventNames" parameter!')
    }

    eventNames.forEach(singleName => {
        addCompilerPlugin(compiler, singleName, pluginFunc)  
    })
}
