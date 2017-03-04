const chalk    = require('chalk');
const inquirer = require('inquirer');


class CreateMigration {

  constructor(cli) {
    this.cli      = cli;
    this.nomad    = this.cli.nomad;
    this.commands = this.cli.commands;
    this.options  = this.cli.options;
  }

  exec(cb) {
    if (this.options.h || this.options.help) {
      this.cli.textOut('create-migrations-help');
      return cb(null);
    }

    if (this.commands.length > 1) {
      this.cli.writeErr('Too many commands\n\n');
      this.cli.textOut('apply-migrations-help');
      return cb(null);
    }

    this.cli.writeOut('Creating new migration\n\n');

    this._getMigrationNameAndDescription((name, description) => {
      if (!name || !description) { return cb(null); }

      this.nomad.writeMigration({ name, description }, (err) => {
        if (err) {
          this.cli.writeErr('Failed to create migration\n', err);
          return cb(null);
        }

        this.cli.writeOut(chalk.green('\nMigration created successfully\n\n'));
        cb(null);
      });
    });
  }

  _getMigrationNameAndDescription(cb) {
    if (
      this.options.silent && (
        (!this.options.name        && !this.options.n) ||
        (!this.options.description && !this.options.d)
      )
    ) {
      this.cli.writeOut(
        'Aborting migration creation as a name and description is requred when running in ' +
        'slient mode.\n\n'
      );
      return cb();
    }

    inquirer.prompt([
      {
        type    : 'input',
        name    : 'name',
        message : 'What is the name of the migration?',
        filter  : val => val.toLowerCase(),
        validate: (val) => {
          if (/[^a-z0-9-]/.test(val)) {
            return 'The name may only contain letters numbers and dashes';
          }
          return true;
        },
      },
      {
        type    : 'input',
        name    : 'description',
        message : 'What does the migration do?',
        validate: val => val ? true : 'The description is requred',
      },
    ]).then(({ name, description }) => cb(name, description));
  }
}


module.exports = CreateMigration;
