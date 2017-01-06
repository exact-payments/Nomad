const chalk    = require('chalk');
const inquirer = require('inquirer');


class ApplyMigrations {

  constructor(cli) {
    this.cli      = cli;
    this.nomad    = this.cli.nomad;
    this.commands = this.cli.commands;
    this.options  = this.cli.options;
  }

  exec(cb) {
    if (this.options.h || this.options.help) {
      this.cli.textOut('reverse-migrations-help');
      return cb(null);
    }

    if (this.commands.length > 2) {
      this.cli.writeErr('Too many commands\n\n');
      this.cli.textOut('reverse-migrations-help');
      return cb(null);
    }

    const target = this.commands[1];
    this.cli.writeOut(`Reversing applied migrations up to and including ${target}\n\n`);

    this.nomad.down(target, {
      onReverseMigration  : (...args) => this._onReverseMigration(...args),
      onReversedMigration : (...args) => this._onReversedMigration(...args),
      canReverseMigrations: (...args) => this._canReverseMigrations(...args),
    }, (err) => {
      if (err) {
        this.cli.writeErr('Failed to complete migration\n', err);
        return cb(null);
      }

      this.cli.writeOut(chalk.green('\nMigration completed successfully\n\n'));
      cb(null);
    });
  }

  _onReverseMigration(migration) {
    this.cli.writeOut(chalk.red('   | <- '), `${migration.name} - Reversing migration\n`);
  }

  _onReversedMigration(migration) {
    this.cli.writeOut(chalk.red(' <-|--- '), `${migration.name} - Reversed migration\n`);
  }

  _canReverseMigrations(migrations, cb) {
    this.cli.writeOut(chalk.bold('The following migrations will be reversed:\n'));
    this._listMigrations(chalk.red('#{i}. '), migrations);
    this.cli.writeOut('\n');

    const onOk = () => {
      this.cli.writeOut(
        'Preceeding with migration...\n\n'
      );
      cb(true);
    };

    if (this.options.silent || this.options['force-reverse']) {
      return onOk();
    }

    inquirer.prompt([
      {
        type   : 'confirm',
        name   : 'ok',
        message: 'Are you sure you want to continue?',
        default: true,
      },
    ]).then(({ ok }) => {
      this.cli.writeOut('\n');

      if (!ok) {
        this.cli.writeOut(
          'Aborting migration as you have declined to reverse the migrations ' +
          'listed above.\n\n'
        );
        return cb(false);
      }

      onOk();
    });
  }

  _listMigrations(margin, migrations) {
    const pad = (str, len) => {
      while (str.length < len) { str += ' '; }
      return str;
    };
    const nameWidth = migrations.reduce((a, m) => Math.max(a, m.name.length + 1), 0);
    for (let i = 0; i < migrations.length; i += 1) {
      const migrationName = pad(`${migrations[i].name}:`, nameWidth);
      this.cli.writeOut(
        chalk.green(margin.replace('#{i}', i)),
        `${migrationName} ${migrations[i].description}\n`
      );
    }
  }
}


module.exports = ApplyMigrations;
