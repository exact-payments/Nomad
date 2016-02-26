
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
    targetMigration : migrationName,
    confirmMigration: confirmMigration
  }, function(err, count) {
    if (err) { throw err; }
    console.log(count ? count + ' migrations rolled back' : 'no migrations to rollback');
    console.log();
    console.log(chalk.white.bold('Operation Complete'));
    console.log();
  });
};

function confirmMigration(migration, cb) {
  console.log('Rolling back migration ' + chalk.cyan(migration.name));

  cb(null, true);
};
