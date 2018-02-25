# webpack-dev-runner

Command line tool which takes a webpack configuration, watches for code changes, and automatically (re)builds and (re)starts your service bundle.

## Usage

```bash
webpack-dev-runner --config <config-file> [options]
```
```bash
webpack-dev-runner --version
```
```bash
webpack-dev-runner --help
```

| Options |||
--------------------------|-----------------------|---------------------------------------
`--config`                | [string] [required]   | Path to the webpack configuration file.
`--delay`                 | [number] [default: 0] | Delay (re)starting the bundle process by a specified number of milliseconds after it was built.
`--dev`,                  | [boolean]             | Force development environment, i.e.: `NODE_ENV = 'development'`.
`--colors`, `--color`     | [boolean]             | Enable usage of colors on the console.
`--display-error-details` | [boolean]             | Display details about errors.
`-h`, `--help`            | [boolean]             | Show help.
`-v`, `--version`         | [boolean]             | Show version number.

## How it works

`webpack-dev-runner` is a simple script that takes a webpack configuration and makes use of the webpack Node API to [watch](https://webpack.js.org/configuration/watch) for code changes.

Then it makes use of the Node [Cluster API](https://nodejs.org/dist/latest-v8.x/docs/api/cluster.html) to run the built bundle as a separate process. Process lifetime is controlled using `cluster.setupMaster()`, `cluster.fork()` and `worker.kill()` (using the default `SIGTERM` signal). Whenever a new bundle is built, the previous process is replaced by a new one running the new bundle.

Despite its simplicity, this is very useful in development as it allows you to keep an “always up to date” version of your server side script running, similar to what can be achieved with `webpack-dev-server` for the client-side.

## Limitations

Please keep in mind that `webpack-dev-runner` is **not able to**:

* Achieve real hot reloading, in the sense of preserving internal state of the previous running process.
  * To be fair, this would not be possible anyway, as it would require access to the internals of a running node process — a clear security vulnerability.
  * As a workaround, you can write internal state that should be kept to a separate file (or, even better, to a database).

* Run only in memory, like in `webpack-dev-middleware` or `webpack-dev-server`.
  * This limitation comes from how `memory-fs` works, by keeping the file in a data object, which is of course not accessible to `cluster.fork()`.
  * I'm currently playing with the idea of moving the result from `memory-fs` to a temporary file before actually running it. This would at least have a the benefit of leaving your `build`/`dist` folder untouched. Expect some news about this at some point in the future.

## Disclaimer

Despite its name, `webpack-dev-runner` is not part of the [webpack](https://webpack.js.org) project or any of its sub-projects, or afilliated with it in any manner. The choice of name was motivated solely on having the most descriptive name for what it does, and self-justified by the realisation that so many other projects in the ecosystem name themselves after the tools that they use internally. The motivation for publishing this package is that of sharing with the community, so if you feel that I have misrepresented your project or caused harm in any way, please let me know ASAP and I will be happy to change its name or this description on request.
