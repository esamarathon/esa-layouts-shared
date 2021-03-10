const globby = require('globby');
const { dirname } = require('path');
const concurrently = require('concurrently');
const yargs = require('yargs');

const args = yargs.options({
  'c': {
    alias: 'context',
    type: 'string',
    choices: [
      'dashboard',
      'extension',
    ],
    default: 'extension',
  },
  's': {
    alias: 'script',
    type: 'string',
    choices: [
      'autofix',
      'build',
      'watch',
      'install',
    ],
    default: 'build',
  }
}).argv;

const packages = globby.sync(`*/${args.c}/package.json`);
const dirs = packages.map((pkg) => dirname(pkg));
concurrently(dirs.map((d) => ({ command: `cd ${d} && npm ${args.s !== 'install' ? 'run ' : ''}${args.s}` })))
  .catch((err) => { console.log(err); });
