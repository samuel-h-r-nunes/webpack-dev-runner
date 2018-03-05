'use strict'

const CONFIG_GROUP  = "Config options:"
const DISPLAY_GROUP = "Stats options:"

const packageInfo = require('../package.json')

module.exports = function (yargs) {
	yargs
        .usage(
            `webpack-dev-runner version ${packageInfo.version}\n` +
            'Usage: webpack-dev-runner --config <config-file> [options]\n\n' +
            `Homepage: ${packageInfo.homepage}`
        )
        .help('h')
        .alias('h', 'help')
        .version('v')
        .alias('v', 'version')
        .options({
            'config': {
                type:        'string',
                requiresArg: true,
                describe:    'Path to the webpack configuration file',
                group:       CONFIG_GROUP
            },
            'delay': {
                type:        'number',
                requiresArg: true,
                default:     0,
                group:       CONFIG_GROUP,
                describe:    'Delay (re)start of bundle process (ms)'
            },
            'dev': {
                type:     'boolean',
                group:    CONFIG_GROUP,
                describe: 'Force environment (NODE_ENV = "development")'
            },
            'name': {
                type:        'string',
                requiresArg: true,
                describe:    'Process name to display in console output',
                group:       DISPLAY_GROUP
            },
            'colors': {
                type:     'boolean',
                alias:    'color',
                group:    DISPLAY_GROUP,
                describe: 'Enable usage of colors on the console'
            },
            'display-error-details': {
                type:     'boolean',
                group:    DISPLAY_GROUP,
                describe: 'Display details about compilation errors'
            }
        })
        .demand(['config'])
}
