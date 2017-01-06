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
    const target = this.commands[1];

    this.cli.writeOut(
      `Applying pending migrations${target ? ` up to and including ${target}` : ''}\n\n`
    );

    this.nomad.up(target, {
      onApplyMigration             : (...args) => this._onApplyMigration(...args),
      onAppliedMigration           : (...args) => this._onAppliedMigration(...args),
      onReverseMigration           : (...args) => this._onReverseMigration(...args),
      onReversedMigration          : (...args) => this._onReversedMigration(...args),
      canApplyMigrations           : (...args) => this._canApplyMigrations(...args),
      canReverseDivergentMigrations: (...args) => this._canReverseDivergentMigrations(...args),
      canApplyUnreversibleMigration: (...args) => this._canApplyUnreversibleMigration(...args),
    }, (err) => {
      if (err) {
        this.cli.writeErr('Failed to complete migration\n', err);
        return cb(null);
      }

      this.cli.writeOut(chalk.green('\nMigration completed successfully\n\n'));
      cb(null);
    });
  }

  _onApplyMigration(migration) {
    this.cli.writeOut(chalk.green('-> |    '), `${migration.name} - Applying migration\n`);
  }

  _onAppliedMigration(migration) {
    this.cli.writeOut(chalk.green('---|->  '), `${migration.name} - Applied migration\n`);
  }

  _onReverseMigration(migration) {
    this.cli.writeOut(chalk.red('   | <- '), `${migration.name} - Reversing divergent migration\n`);
  }

  _onReversedMigration(migration) {
    this.cli.writeOut(chalk.red(' <-|--- '), `${migration.name} - Reversed divergent migration\n`);
  }

  _canReverseDivergentMigrations(migrations, cb) {
    if (this.options.silent && !this.options['force-reverse-divergent']) {
      this.cli.writeOut(
        'Aborting migration as there are divergent migrations and nomad is ' +
        'running in slient mode.\n\n'
      );
      return cb(false);
    }

    this.cli.textOut('divergent-warning', '\n');

    this.cli.writeOut(chalk.bold('The following migrations will be reversed:\n'));
    this._listMigrations(chalk.red('#{i}. '), migrations);
    this.cli.writeOut('\n');

    const onOk = () => {
      this.cli.writeOut(
        'Preceeding with migration...\n\n'
      );
      cb(true);
    };

    if (this.options['force-reverse-divergent']) {
      return onOk();
    }

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
          'Aborting migration as you have declined to reverse the divergent ' +
          'migrations listed above.\n\n'
        );
        return cb(false);
      }

      onOk();
    });
  }

  _canApplyMigrations(migrations, cb) {
    this.cli.writeOut(chalk.bold('The following migrations will be applied:\n'));
    this._listMigrations(chalk.green('#{i}. '), migrations);
    this.cli.writeOut('\n');

    const onOk = () => {
      this.cli.writeOut(
        'Preceeding with migration...\n\n'
      );
      cb(true);
    };

    if (this.options.silent || this.options['force-apply']) {
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
          'Aborting migration as you have declined to apply the migrations ' +
          'listed above.\n\n'
        );
        return cb(false);
      }

      onOk();
    });
  }

  _canApplyUnreversibleMigration(migration, cb) {
    this.cli.writeOut('[CHECK IF CAN APPLY UNREVERSIBLE MIGRATION]\n\n');
    cb(true);
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
