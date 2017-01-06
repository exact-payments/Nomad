const chalk    = require('chalk');
const inquirer = require('inquirer');


class ShowMigrations {

  constructor(cli) {
    this.cli      = cli;
    this.nomad    = this.cli.nomad;
    this.commands = this.cli.commands;
    this.options  = this.cli.options;
  }

  exec(cb) {
    if (this.options.h || this.options.help) {
      this.cli.textOut('show-migrations-help');
      return cb(null);
    }

    if (this.commands.length > 1) {
      this.cli.writeErr('Too many commands\n\n');
      this.cli.textOut('apply-migrations-help');
      return cb(null);
    }

    const exec = (cb) => {
      this.nomad.getMigrations((err, migrations) => {
        if (err) {
          this.cli.writeErr('Failed to collect migrations\n', err);
          return cb(null);
        }

        const pad = (str, len) => {
          str += ':';
          while (str.length < len) { str += ' '; }
          return str;
        };
        const nameWidth = [].concat(migrations.applied, migrations.unapplied, migrations.divergent)
          .reduce((a, m) => Math.max(a, m.name.length + 1), 0);

        const lines = [];

        // add unapplied migrations
        const unappliedMigrations = migrations.unapplied;
        for (let i = 0; i < unappliedMigrations.length; i += 1) {
          const migration = unappliedMigrations[i];
          const margin    = chalk.green('|->');
          lines.push(`${margin} ${pad(migration.name, nameWidth)} ${migration.description}`);
        }
        lines.push(chalk.green('| UNAPPLIED MIGRATIONS'));

        // add divergent migrations
        lines.unshift(`${chalk.green('|')} ${chalk.red('DIVERGENT MIGRATIONS')}`);
        const divergentMigrations = migrations.divergent;
        for (let i = 0; i < divergentMigrations.length; i += 1) {
          const migration = divergentMigrations[i];
          const margin    = chalk.red((i === 0) ? '+->' : '|->');
          const auxMargin = (i > unappliedMigrations.length - 1) ? ' ' : chalk.green('|');
          const desc      = `${pad(migration.name, nameWidth)} ${migration.description}`;
          lines.unshift(`${auxMargin} ${margin} ${desc}`);
        }
        if (divergentMigrations.length > 0) {
          lines.unshift(chalk.green('|') + chalk.red('/'));
        }

        // add applied migrations
        const appliedMigrations = migrations.applied;
        lines.unshift(`${chalk.yellow('|')} ${chalk.yellow('APPLIED MIGRATIONS')}`);
        for (let i = 0; i < appliedMigrations.length; i += 1) {
          const migration = appliedMigrations[i];
          const margin    = chalk.yellow((i === appliedMigrations.length - 1) ? '+->' : '|->');
          lines.unshift(`${margin} ${pad(migration.name, nameWidth)} ${migration.description}`);
        }
        lines.push(chalk.green('^'));

        this.cli.writeOut(`${lines.reverse().join('\n')}\n`);
        cb(null);
      });
    };

    if (this.options['no-sync']) { return exec(); }

    this.nomad.syncDatabaseAndDisk((err) => {
      if (err) { return cb(err); }
      exec(cb);
    });
  }
}


module.exports = ShowMigrations;
