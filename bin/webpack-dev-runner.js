#! /usr/bin/env node
'use strict'

const chalk    = require('chalk')
const cluster  = require('cluster')
const path     = require('path')
const webpack  = require('webpack')
const yargs    = require('yargs')

// Configuration
require('./config-yargs')(yargs)
const filename     = yargs.argv.config
const colors       = yargs.argv.color
const errorDetails = yargs.argv.displayErrorDetails
const delay        = yargs.argv.delay
if (yargs.argv.dev) {
    process.env = Object.assign({}, process.env, { NODE_ENV: 'development' })
}

// Prettify console output
const configName    = extractConfigName(filename)
const logPrefix     = colors
    ? chalk.gray(`[devRunner:${chalk.blue(configName)}]`)
    : `[devRunner:${configName}]`
const warningPrefix = logPrefix + ' ' + (colors ? chalk.yellow('WRN!') : 'WRN!')
const errorPrefix   = logPrefix + ' ' + (colors ? chalk.red('ERR!') : 'ERR!')

// Control variables
let bundleProcess  = null
let currentBuildNo = 0
let valid          = false

// Create a new compiler with the specified configuration
const options  = require(path.resolve(process.cwd(), filename))
const compiler = webpack(options)

// Create compiler plugins to keep track of whether the bundle is valid
function invalidPlugin() {
    valid = false
}
function invalidAsyncPlugin(compiler, callback) {
    invalidPlugin()
    callback()
}
compiler.plugin('invalid', invalidPlugin)
compiler.plugin('watch-run', invalidAsyncPlugin)
compiler.plugin('run', invalidAsyncPlugin)

// call run on the compiler along with the callback
compiler.watch({
    aggregateTimeout: 300,
    ignored:          /(node_modules|build|dist)/
}, (err, stats) => {
    valid = true
    process.nextTick(function () {
        // Silently discard the bundle if it became invalid meanwhile
        if (!valid) {
            return
        }

        // Check for errors and discard the bundle if needed
        if (!handleErrors(err, stats)) {
            return
        }

        // Finally, we have a valid bundle so we can proceed
        currentBuildNo++
        console.log(
            logPrefix,
            'Build complete:\n\n',
            stats.toString({colors, errorDetails}),
            '\n'
        )
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
 * Execute the specified bundle.
 *
 * @param {String} filePath Path to the bundle file.
 */
function executeBundle (filePath) {
    // Kill previous process
    if (bundleProcess) {
        console.log(logPrefix, 'Replacing running process...\n')
        bundleProcess.kill()
    } else {
        console.log(logPrefix, 'Starting process...\n')
    }

    // Execute bundle as a new process
    cluster.setupMaster({ exec: filePath })
    bundleProcess = cluster.fork(process.env)
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

/**
 * Handle display of compilation errors, and inform whether the generated build
 * is valid.
 *
 * For reference, please see: http://devdocs.io/webpack/api/node#error-handling
 *
 * @param   {Object}  err   Error object, contain webpack-related issues.
 * @param   {Object}  stats Compilation result stats object.
 * @returns {Boolean} Returns true if the build should be considered valid, or
 *                    false otherwise.
 */
function handleErrors (err, stats) {
    // Fatal webpack errors (wrong configuration, etc)
    if (err) {
        console.error(errorPrefix, err.stack || err)
        if (err.details) {
            console.error(errorPrefix, err.details)
        }
        return false
    }

    const info = stats.toJson()

    // Compilation errors (missing modules, syntax errors, etc)
    if (stats.hasErrors()) {
        console.error(errorPrefix, info.errors)
    }

    // Compilation warnings
    if (stats.hasWarnings()) {
        console.warn(warningPrefix, info.warnings)
    }

    return true
}
