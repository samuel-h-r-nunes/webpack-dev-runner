const chalk = require('chalk')

// Control variables
let useColors         = false
let titlePrefix       = ''
let errorPrefix       = ''
let warningPrefix     = ''
let hasPreviousMargin = false

/**
 * Build a message text for for console output.
 *
 * When there's a list of sub-messages, show it as a body text below the main
 * (header) message and put the whole message in a separate paragraph from the
 * ones before and after.
 *
 * @param   {String}   header    The main message text.
 * @param   {Array}    messages  Optional array of sub-messages to display as a
 *                               list under the main message.
 * @param   {Function} colorFunc Optional function to colourize the list of
 *                               sub-messages.
 *
 * @returns {String} Returns a string with the final message text.
 */
const buildMessage = (header, messages, colorFunc) => {
    let text = header

    if (messages && messages.length) {
        // Start with a new line if needed, and keep track of the fact that we
        // be ending with a new line also.
        if (!hasPreviousMargin) {
            text              = '\n' + header
            hasPreviousMargin = true
        }

        // Message body is also spaced from the header
        text += '\n\n' + formatMessageBody(messages) + '\n'
    }

    if (colorFunc && useColors) {
        text = colorFunc(text)
    }

    return text
}

/**
 * Format the given data object to be show as a message body text.
 *
 * Arrays are transformed into bullet lists, objects are converted to their
 * string equivalents, and strings remain untouched.
 *
 * @param   {String|Array|*} data The data to be formatted.
 *
 * @returns {String}         Returns a string with the message body text.
 */
const formatMessageBody = (data) => {
    switch (data.constructor) {
        case String:
            return data

        // Show array of sub-messages as a bullet list
        case Array:
            return '  ● ' + data.join('\n  ● ')

        default:
            return data.toString()
    }
}

/**
 * Write an error message to the console.
 *
 * @param {String} message The main error message text.
 * @param {Array}  errors  Optional array of sub error messages to display as a
 *                         list under the main message.
 */
const error = (message, errors) => {
    console.error(error.prepare(message, errors))
}

/**
 * Prepare error message text.
 *
 * @param   {String} message The main message text, without the `error` part.
 * @param   {Array}  errors  Optional array of sub error messages to display as
 *                           a list under the main message.
 * @returns {Object} Returns the formatted warning message text.
 */
error.prepare = (message, errors) => {
    return buildMessage(`${errorPrefix} ${message}`, errors, chalk.red)
}

/**
 * Write a message to the console.
 *
 * @param {String} message     The main message text.
 * @param {Array}  subMessages Optional array of sub-messages to display as a
 *                             list under the main message.
 */
const output = (message, subMessages) => {
    console.log(buildMessage(`${titlePrefix} ${message}`, subMessages))
}

/**
 * Write a warning message to the console.
 *
 * @param {String} message  The main warning message text.
 * @param {Array}  warnings Optional array of sub warning messages to display
 *                          as a list under the main message.
 */
const warning = (message, warnings) => {
    console.warn(warning.prepare(message, warnings))
}

/**
 * Prepare warning message text.
 *
 * @param   {String} message  The main message text without the `warning` part.
 * @param   {Array}  warnings Optional array of sub warning messages to display
 *                            as a list under the main message.
 * @returns {Object} Returns the formatted warning message text.
 */
warning.prepare = (message, warnings) => {
    return buildMessage(`${warningPrefix} ${message}`, warnings, chalk.yellow)
}

/**
 * Configure and return the output functions.
 *
 * @param   {String}  title        Unique name identifying the output scope.
 * @param   {Boolean} enableColors Set to a `truthy` value to enable the output
 *                                 of coloured messages.
 * @returns {Object}  Returns an object containing: { error, output, warning }
 */
module.exports = function (title, enableColors) {
    if (enableColors) {
        useColors     = true
        titlePrefix   = chalk.gray.bold(`[devRunner:${chalk.blueBright(title)}]`)
        errorPrefix   = chalk.black.bgRed(' ERROR ')
        warningPrefix = chalk.black.bgYellow(' WARNING ')
    } else {
        titlePrefix   = chalk.bold(`[devRunner:${title}]`)
        errorPrefix   = chalk.black.inverse(' ERROR ')
        warningPrefix = chalk.black.inverse(' WARNING ')
    }

    return { error, output, warning }
}
