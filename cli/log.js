
var chalk = require('chalk');
var nomad = require('../');


module.exports = function(yargs) {
  var argv = yargs.usage('Usage: $0 log [options]')
    .example('$0 log')
    .example('$0 log -m json')
    .alias('m', 'mode')
    .default('m', 'cli')
    .describe('m', 'The output mode of the log')
    .choices('m', ['cli', 'json'])
    .string('f')
    .alias('h', 'help')
    .help('h')
    .argv;

  if (argv.m === 'cli') { cliLog(); }
  if (argv.m === 'json') { jsonLog(); }
};


function cliLog() {
  console.log();
  console.log(chalk.white.bold('Migration Log'));
  console.log();

  nomad.log('cli', function(err, log) {
    if (err) { throw err; }
    console.log(log);
  });
};

function jsonLog() {
  nomad.log('json', function(err, log) {
    if (err) { throw err; }
    console.log(log);
  });
};
