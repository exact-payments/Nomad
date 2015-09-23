
var chalk    = require('chalk');
var inquirer = require('inquirer');
var nomad    = require('../');


module.exports = function(yargs) {
  var argv = yargs.usage('Usage: $0 down <target>')
    .demand(2)
    .example('$0 down addPhoneToUser')
    .argv;

  var migrationName = argv._[1];


  console.log();
  console.log(chalk.white.bold('Migrate Down'));
  console.log();

  return nomad.down({
    targetMigration   : migrationName,
    confirmMigration  : confirmMigration,
    confirmWriteToDisk: confirmWriteToDisk
  }, function(err, count) {
    if (err) { throw err; }
    console.log(count ? count + ' migrations rolled back' : 'no migrations to rollback');
    console.log();
    console.log(chalk.white.bold('Operation Complete'));
    console.log();
  });
};

function confirmWriteToDisk(migration, next, stop) {

  console.log();

  inquirer.prompt([{
    type   : 'confirm',
    name   : 'isOk',
    default: false,
    message: 'The migration ' + chalk.cyan(migration.name) + ' is not on ' +
    'disk. Do you want to create it on disk?'
  }], function(answers) {
    console.log();

    if (!answers.isOk) { return stop(); }
    next(null);
  });
};


function confirmMigration(migration, next, stop) {
  console.log('Rolling back migration ' + chalk.cyan(migration.name));

  next(null);
};

function confirmUpdateInDb(migration, next, stop) {

  console.log();

  inquirer.prompt([{
    type   : 'confirm',
    name   : 'isOk',
    default: true,
    message: 'The migration ' + chalk.cyan(migration.name) + ' has been' +
    'updated on disk and is not in sync with the database. Do you want to ' +
    'update it in the database?'
  }], function(answers) {
    console.log();

    if (!answers.isOk) { return stop(); }
    next(null);
  });
};
