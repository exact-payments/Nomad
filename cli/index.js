/* eslint-disable no-console */
const nomad = require('../');
const Cli   = require('./cli');

if (process.argv.length === 2) {
  // TODO: use blessed to make a UI
}

const cli = new Cli(nomad);

if (cli.parseArgv(process.argv)) {
  cli.exec();
}
