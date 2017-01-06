const fs              = require('fs');
const path            = require('path');
const chalk           = require('chalk');
const stripAnsi       = require('strip-ansi');

const ApplyMigrations   = require('./apply-migrations');
const ReverseMigrations = require('./reverse-migrations');


const noop = (err) => {
  if (err) { throw err; }
};

class Cli {

  constructor(nomad) {
    this.nomad    = nomad;
    this.options  = null;
    this.commands = null;
    this.handlers = {
      up  : ApplyMigrations,
      down: ReverseMigrations,
    };
  }

  parseArgv(argv) {
    const pargv        = argv.slice(2);
    const optionsIndex = pargv.findIndex(a => a[0] === '-');
    const rawOptions   = optionsIndex > -1 ? pargv.slice(optionsIndex)    : [];
    const commands     = optionsIndex > -1 ? pargv.slice(0, optionsIndex) : pargv;

    const options = {};
    for (let i = 0; i < rawOptions.length; i += 1) {
      let   option = rawOptions[i];
      const value  = rawOptions[i + 1];

      if (option.slice(0, 2) === '--') {
        option = option.slice(2);
      } else if (option[0] === '-') {
        option = option[1];
      } else {
        this.writeErr(`${option} is not a valid option\n\n`);
        this.textOut('help');
        return false;
      }

      if (!value || value[0] === '-') {
        options[option] = true;
      } else {
        options[option] = value;
        i += 1;
      }
    }

    this.options  = options;
    this.commands = commands;
    return true;
  }

  exec(cb = noop) {
    const handlerName = this.commands[0];
    const Handler     = this.handlers[handlerName];

    if (!handlerName) {
      this.textOut('help');
      return cb(null);
    }

    if (!Handler) {
      this.writeErr(`${handlerName} is not a valid command\n\n`);
      this.textOut('help');
      return cb(null);
    }

    this._loadNomadFile(() => {
      const handler = new Handler(this);
      handler.exec(cb);
    });
  }

  textOut(filename, str) {
    this.writeOut(fs.readFileSync(path.join(__dirname, `text/${filename}.txt`), 'utf8'));
    if (str) { this.writeOut(str); }
  }

  writeOut(marginStr, str) {
    // TODO: Handle json, yml or xml output
    if (this.options.slient && !this.options.help && !this.options.h) { return; }
    if (str === undefined) {
      str       = marginStr;
      marginStr = '';
    }
    str = marginStr + str;
    if (this.options['no-color']) {
      str = stripAnsi(marginStr + str);
    }
    process.stdout.write(str);
  }

  writeErr(str, err) {
    // TODO: Handle json, yml or xml output
    if (this.options.slient) {
      if (err) { process.stderr.write(err.stack); }
      return;
    }
    str = stripAnsi(str);
    if (!this.options['no-color']) {
      str = chalk.red(str);
    }
    process.stderr.write(str);
    if (err) {
      if (this.options.v || this.options.verbose) {
        process.stderr.write(`\n${err.stack}`);
      } else {
        process.stderr.write(`\n${err.message}\n`);
      }
    }
  }

  _loadNomadFile(cb) {
    const opts = {};
    let   nomadFilePath  = this.options.c || this.options.config;
    const migrationsPath = this.options.m || this.options.migrations;

    nomadFilePath = nomadFilePath ?
      path.resolve(nomadFilePath) :
      path.join(process.cwd(), 'NomadFile.js');

    migrationsPath && (opts.migrationsPath = migrationsPath);

    this.nomad.loadNomadFileByPath(nomadFilePath, opts, (err) => {
      if (err) {
        return this.writeErr(`\nFailed to load NomadFile at path ${nomadFilePath}\n\n`, err);
      }
      cb(err);
    });
  }
}


module.exports = Cli;
