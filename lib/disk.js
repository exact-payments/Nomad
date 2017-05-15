const path      = require('path');
const fs        = require('fs');
const mkdirp    = require('mkdirp');
const async     = require('async');
const glob      = require('glob');
const Migration = require('./migration');


const noop = (err) => {
  if (err) { throw err; }
};

class Disk {

  constructor(nomadFile) {
    this.nomadFile      = nomadFile;
    this.migrationsPath = nomadFile.migrationsPath;
  }

  getMigrations(cb = noop) {
    const date  = '[0-9]'.repeat(8);
    const time  = '[0-9]'.repeat(6);
    const index = '[0-9]'.repeat(2);

    glob(`${date}-${time}-${index}.*.js`, {
      cwd     : this.migrationsPath,
      silent  : true,
      nodir   : true,
      absolute: true,
    }, (err, migrationPaths) => {
      if (err) { return cb(err); }

      async.map(migrationPaths, (migrationPath, cb) => {
        fs.readFile(migrationPath, 'utf8', (err, src) => {
          if (err) { return cb(err); }

          const migration = new Migration(this.nomadFile, {
            filename: path.basename(migrationPath),
            src,
          });

          try {
            migration.validate();
          } catch (err) {
            migration.isIgnored  = true;
            migration.errorStack = err.stack;
          }

          cb(null, migration);
        });
      }, (err, migrations) => {
        if (err) { return cb(err); }

         // TODO: Add an opt to expose ignored migrations
        cb(null, migrations.filter(m => !m.isIgnored));
      });
    });
  }

  writeMigration(migration, cb = noop) {
    const migrationPath = path.join(this.migrationsPath, migration.filename);
    const src           = migration.src || migration.appliedSrc;
    mkdirp(this.migrationsPath, (err) => {
      if (err) { return cb(err); }
      fs.writeFile(migrationPath, src, err => cb(err));
    });
  }
}

module.exports = Disk;
