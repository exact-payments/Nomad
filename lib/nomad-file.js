const path = require('path');


const noop = (err) => {
  if (err) { throw err; }
};

class NomadFile {

  static fromPath(nomadFilePath, opts = {}, cb = noop) {
    let nomadFileFn;
    try {
      // eslint-disable-next-line global-require
      nomadFileFn = require(nomadFilePath);
    } catch (err) {
      return cb(new Error(
        `Failed to require ${path.relative(process.cwd(), nomadFilePath)}: ${err.stack}`
      ));
    }
    if (typeof nomadFileFn !== 'function') {
      return cb(new Error(
        `${path.relative(process.cwd(), nomadFilePath)} does not export a function`
      ));
    }

    opts.nomadFilePath = nomadFilePath;

    let nomadFile;
    try {
      nomadFile = new this(nomadFileFn, opts);
    } catch (err) {
      return cb(new Error(
        `failed executing ${path.relative(process.cwd(), nomadFilePath)}: ${err.stack}`
      ));
    }
    cb(null, nomadFile);
  }

  static create(nomadFilePath, opts = {}, cb = noop) {
    cb(new Error('Init not yet implemented...'));
  }

  constructor(fn, opts = {}) {

    this.context        = {};
    this.nomadFilePath  = opts.nomadFilePath;
    this.migrationsPath = opts.migrationsPath ||
      path.join(path.dirname(this.nomadFilePath), 'migrations');

    this.connectFn         = null;
    this.disconnectFn      = null;
    this.insertMigrationFn = null;
    this.getMigrationsFn   = null;
    this.updateMigrationFn = null;
    this.removeMigrationFn = null;

    fn(this, opts);
    if (!this.connectFn) {
      throw new Error('NomadFile failed to implement a database driver.');
    }
  }

  driver(driverOpts) {
    const fns = {
      connectFn        : 'connect',
      disconnectFn     : 'disconnect',
      insertMigrationFn: 'insertMigration',
      getMigrationsFn  : 'getMigrations',
      updateMigrationFn: 'updateMigration',
      removeMigrationFn: 'removeMigration',
    };

    for (const instProp in fns) {
      const optsProp = fns[instProp];
      const fn       = driverOpts[optsProp];

      if (!fn) {
        throw new Error(`NomadFile database driver must implement ${optsProp}`);
      }
      if (typeof fn !== 'function') {
        throw new Error(`NomadFile database driver ${optsProp} must be a function`);
      }

      this[instProp] = fn;
    }
  }
}


module.exports = NomadFile;
