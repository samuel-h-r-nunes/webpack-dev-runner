#! /usr/bin/env node
'use strict'

const cluster           = require('cluster')
const path              = require('path')
const webpack           = require('webpack')
const yargs             = require('yargs')
const addCompilerPlugin = require('./add-compiler-plugin')

// Configuration
require('./config-yargs')(yargs)
const filename     = yargs.argv.config
const colors       = yargs.argv.color
const errorDetails = yargs.argv.displayErrorDetails
const delay        = yargs.argv.delay
if (yargs.argv.dev) {
    process.env = Object.assign({}, process.env, { NODE_ENV: 'development' })
}

// Setup console output
const { error, output, warning } = require('./output')(
    yargs.argv.name || extractConfigName(filename),
    colors
)

// Control variables
let bundleProcess  = null
let currentBuildNo = 0
let valid          = false

// Create a new compiler with the specified configuration
const options  = parseConfiguration(filename)
const compiler = webpack(options)

// Create compiler plugins to keep track of whether the bundle is valid
function invalidPlugin () {
    valid = false
}
addCompilerPlugin(compiler, 'invalid', invalidPlugin)
addCompilerPlugin(compiler, ['watch-run', 'run'], (compiler, callback) => {
    invalidPlugin()
    callback()
})

// call run on the compiler along with the callback
compiler.watch({
    aggregateTimeout: 300,
    ignored:          /(node_modules|build|dist)/
}, (err, stats) => {
    valid = true
    process.nextTick(function () {
        // Discard bundle if it became invalid meanwhile or if there are errors
        if (!valid || !checkErrors(err)) {
            return
        }

        // Write the built stats to the console
        output('Build complete:', buildOutput(stats))

        // Finally, proceed with executing the bundle
        currentBuildNo++
        const bundlePath = path.resolve(
            options.output.path,
            options.output.filename
        )
        scheduleExecution(bundlePath, currentBuildNo)
    })
})

/*****************************************************************************/
/*                           - Helper functions -                            */
/*****************************************************************************/

/**
 * Build an output string for the compilation stats, including warnings and errors.
 *
 * For reference, please see: https://webpack.js.org/api/node#stats-tostring-options-
 *
 * @param   {Object} stats Compilation result stats object.
 * @returns {String} Returns a formatted text string for console output.
 */
function buildOutput (stats) {
    const info = stats.toJson({ errorDetails })
    let output = stats.toString({
        warnings: false,
        errors:   false,
        colors
    });

    // Compilation errors (missing modules, syntax errors, etc)
    if (stats.hasErrors()) {
        output += '\n\n' + error.prepare('in ' + info.errors)
    }

    // Compilation warnings
    if (stats.hasWarnings()) {
        output += '\n\n' + warning.prepare('in ' + info.warnings)
    }

    return output
}

/**
 * Check for fatal webpack errors (e.g. configuration), and inform whether the
 * generated build is valid.
 *
 * For reference, please see: https://webpack.js.org/api/node#error-handling
 *
 * @param   {Object}  err Error object, contain webpack-related issues.
 * @returns {Boolean} Returns true if the build should be considered valid, or
 *                    false otherwise.
 */
function checkErrors (err) {
    // Fatal webpack errors (wrong configuration, etc)
    if (err) {
        error(err.stack || err)
        if (err.details) {
            error(err.details)
        }
        return false
    }
    return true
}

/**
 * Execute the specified bundle.
 *
 * @param {String} filePath Path to the bundle file.
 */
function executeBundle (filePath) {
    // Kill previous process
    if (bundleProcess) {
        output('Replacing running process...\n')
        bundleProcess.kill()
    } else {
        output('Starting process...\n')
    }

    // Execute bundle as a new process
    cluster.setupMaster({ exec: filePath })
    bundleProcess = cluster.fork(process.env)
}

/**
 * Retrieve and validate the specified webpack configuration. On error, the
 * runner will be terminated.
 *
 * @param   {String} filePath Path to the target webpack configuration file.
 * @returns {Object} Returns a data object containing the loaded webpack
 *                   configuration.
 */
function parseConfiguration (filePath) {
    const configuration = require(path.resolve(process.cwd(), filePath))
    let errors          = []

    if (!configuration.output) {
        errors.push('Output configuration is missing')
    } else {
        if (!configuration.output.path) {
            errors.push('Output path is missing')
        }
        if (!configuration.output.filename) {
            errors.push('Output filename is missing')
        }
        else if (/[\[\]]/.test(configuration.output.filename)) {
            errors.push(
                'Output filename must not contain substitutions (e.g. `[name]`, `[hash]`, etc.)'
            )
        }
    }

    if (errors.length) {
        error('Aborted due to unmet configuration restrictions:', errors)
        process.exit(1);
    }

    return configuration;
}

/**
 * Schedule execution of the specified bundle after the configured delay, if
 * any.
 *
 * @param {String} filePath Path to the bundle file.
 * @param {Number} buildNo  Build number of the bundle to be executed.
 */
function scheduleExecution (filePath, buildNo) {
    if (delay) {
        setTimeout(() => {
            // Don't run the bundle if it became invalid meanwhile
            if (!valid || buildNo !== currentBuildNo) {
                return
            }
            executeBundle (filePath)
        }, delay);
    } else {
        executeBundle (filePath)
    }
}

/**
 * Generate a short name that identifies the specified webpack configuration
 * by removing trailing redundant words, like "webpack", "config", etc.
 *
 * @param {String} filePath Partial or complete path to the target webpack
 *                          configuration file, containing at least the file
 *                          basename.
 */
function extractConfigName (filePath) {
    const redundantWords = [
        'js',
        'webpack',
        'webpackfile',
        'configuration',
        'config'
    ]
    let result = path.basename(filePath)
    for (let oldResult; oldResult !== result; oldResult = result) {
        redundantWords.forEach((remove) => {
            result = result
                .replace(RegExp(`^${remove}[\\.-_]`), '')
                .replace(RegExp(`[\\.-_]${remove}$`), '')
                .replace(RegExp(`^${remove}$`), '')
        })
    }
    if (!result.length) {
        result = 'default'
    }
    return result
}
