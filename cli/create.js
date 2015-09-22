
var chalk    = require('chalk');
var inquirer = require('inquirer');
var nomad    = require('../');


module.exports = function(yargs) {
  var argv = yargs.usage('Usage: $0 create [options]')
    .example('$0 create')
    .example('$0 create -n addPhoneToUser')
    .example('$0 create -n addPhoneToUser -d "Adds a phone number field to users"')
    .alias('n', 'name')
    .string('n')
    .describe('n', 'The name of the migration')
    .alias('d', 'description')
    .string('d')
    .describe('d', 'A destription of what the migration does')
    .alias('h', 'help')
    .help('h')
    .argv;

  var create = function(name, description) {
    nomad.create(name, description, function(err, result) {
      if (err) { throw err; }

      console.log();
      console.log('Created migration ' + chalk.cyan(result.name) + ' at ' + chalk.cyan(result.path));
    });
  };

  if (argv.name) {
    return create(argv.name, argv.description || '');
  }

  console.log();
  console.log(chalk.white.bold('Create New Nomad Migration'));
  console.log();

  inquirer.prompt([
    { name: 'name'       , message: 'What do you want to name the migration?' },
    { name: 'description', message: 'What does the migration do?' }
  ], function(answers) {
    create(answers.name, answers.description);
  });

};
