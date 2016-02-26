
var chalk    = require('chalk');
var inquirer = require('inquirer');
var nomad    = require('../');


module.exports = function(yargs) {
  var argv = yargs.usage('Usage: $0 up [target]')
    .example('$0 up')
    .example('$0 up addPhoneToUser')
    .argv;

  var migrationName = argv._[1];


  console.log();
  console.log(chalk.white.bold('Migrate Up'));
  console.log();

  return nomad.up({
    targetMigration   : migrationName,
    confirmMigration  : confirmMigration
  }, function(err, count) {
    if (err) { throw err; }
    console.log(count ? count + ' migrations applied' : 'no migrations pending');
    console.log();
    console.log(chalk.white.bold('Operation Complete'));
    console.log();
  });
};

function confirmMigration(migration, cb) {
  console.log('Applying migration ' + chalk.cyan(migration.name));

  if (migration.isReversible === null) {
    console.log();
    console.log(
      'isReversible is not set for the migration ' + chalk.red(migration.name) +
      '. Please set it to ' + chalk.cyan('true') + ' or ' + chalk.cyan('false')
    );
    console.log();

    return cb(null, false);
  }

  if (!migration.isReversible) {

    console.log();

    inquirer.prompt([{
      type   : 'confirm',
      name   : 'isOk',
      default: false,
      message: 'The migration ' + chalk.cyan(migration.name) + ' is not ' +
      'reversable. Are you sure you want to apply it?'
    }], function(answers) {
      console.log();

      cb(null, answers.isOk);
    });
  } else {
    cb(null, true);
  }
};
