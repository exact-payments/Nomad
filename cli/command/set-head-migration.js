const chalk    = require('chalk');
const inquirer = require('inquirer');


class SetHeadMigration {

  constructor(cli) {
    this.cli      = cli;
    this.nomad    = this.cli.nomad;
    this.commands = this.cli.commands;
    this.options  = this.cli.options;
  }

  exec(cb) {
    if (this.options.h || this.options.help) {
      this.cli.textOut('set-head-migration-help');
      return cb(null);
    }

    if (this.commands.length > 2) {
      this.cli.writeErr('Too many commands\n\n');
      this.cli.textOut('set-head-migration-help');
      return cb(null);
    }

    const exec = (cb) => {
      const target = this.commands[1];

      if (!target) {
        this.cli.writeErr('Target migration is required\n');
        return cb(null);
      }

      this.cli.writeOut(`Setting head migration to ${target}\n\n`);

      this.nomad.setHead(target, {
        canMarkMigrations: (...args) => this._canMarkMigrations(...args),
      }, (err) => {
        if (err) {
          this.cli.writeErr('Failed to set head migration\n', err);
          return cb(null);
        }

        this.cli.writeOut(chalk.green(`\nHead migration set to ${target} successfully\n\n`));
        cb(null);
      });
    };

    if (this.options['no-sync']) { return exec(cb); }

    this.nomad.syncDatabaseAndDisk((err) => {
      if (err) { return cb(err); }
      exec(cb);
    });
  }

  _canMarkMigrations(migrationsToMarkUnapplied, migrationsToMarkApplied, isOk) {
    if (this.options.silent || this.options['force-set-head']) {
      return isOk(true);
    }

    this.cli.textOut('set-head-warning', '\n');

    this.cli.writeOut(chalk.bold('The following migrations will be marked unapplied:\n'));
    this._listMigrations(chalk.red('- '), migrationsToMarkUnapplied);
    this.cli.writeOut('\n');

    this.cli.writeOut(chalk.bold('The following migrations will be marked applied:\n'));
    this._listMigrations(chalk.green('+ '), migrationsToMarkApplied);
    this.cli.writeOut('\n');

    inquirer.prompt([
      {
        type   : 'confirm',
        name   : 'ok',
        message: 'Are you sure you want to continue?',
        default: false,
      },
    ]).then(({ ok }) => {
      this.cli.writeOut('\n');

      if (!ok) {
        this.cli.writeOut(
          'Aborting migration as you have declined to mark the migrations listed above.\n\n'
        );
        return isOk(false);
      }

      this.cli.writeOut(
        'Preceeding with marking head migration...\n\n'
      );
      isOk(true);
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
        margin,
        `${migrationName} ${migrations[i].description}\n`
      );
    }
  }
}


module.exports = SetHeadMigration;
