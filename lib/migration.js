
var vm       = require('vm');
var fs       = require('fs');
var path     = require('path');
var async    = require('async');
var mkdirp   = require('mkdirp');


function Migration(record) {
  if (!Migration.driver) { throw new Error('Migration.driver not set'); }

  this.isNew        = true;
  this.filename     = record.filename     || '';
  this.name         = record.name         || '';
  this.description  = record.description  || '';
  this.src          = record.src          || '';
  this.isApplied    = record.isApplied    || false;
  this.isIgnored    = record.isIgnored    || false;
  this.isReversible = record.isReversible || null;
  this.appliedAt    = record.appliedAt    || null;
  this.rolledBackAt = record.rolledBackAt || null;
}

Migration.driver             = null;
Migration.migrationsPath     = '';
Migration.confirmWriteToDisk = function(_, next, _) { next(null); };

Migration.getAll = function(opts, cb) {
  var _this = this;

  if (typeof opts === 'function') {
    cb = opts; opts = {};
  }

  opts                || (opts      = {});
  opts.sync !== false || (opts.sync = true);

  if (!Migration.driver) { throw new Error('Migration.driver not set'); }

  async.auto({

    migrationDataFromDisk: [function(cb) {
      if (!opts.sync) { cb(null, {}); }

      var migrationData = {};
      fs.readdir(Migration.migrationsPath, function(err, filenames) {
        if (err) { return cb(err); }
        async.each(filenames, function(filename, cb) {
          var migrationPath = path.join(_this.migrationsPath, filename);

          var dataFromDisk = {};
          fs.readFile(migrationPath, 'utf8', function(err, src) {
            if (err) { return cb(err); }

            var migrationModule = require(migrationPath);

            dataFromDisk.filename     = filename                     || '';
            dataFromDisk.src          = src                          || '';
            dataFromDisk.name         = migrationModule.name         || '';
            dataFromDisk.description  = migrationModule.description  || '';
            dataFromDisk.isIgnored    = migrationModule.isIgnored    || false;
            dataFromDisk.isReversible = migrationModule.isReversible || null;

            migrationData[filename] = dataFromDisk;
            cb(null);
          });
        }, function(err) {
          if (err) { return cb(err); }
          cb(null, migrationData);
        });
      });
    }],

    migrationDataFromDb: [function(cb) {
      _this.driver.getMigrations(function(err, records) {
        var migrationData = {};
        for (var i = 0; i < records.length; i += 1) {
          migrationData[records[i].filename] = records[i];
        }
        cb(null, migrationData);
      });
    }],

    migrations: ['migrationDataFromDisk', 'migrationDataFromDb', function(cb, d) {
      var filenames = Object.keys(d.migrationDataFromDb);
      for (var filename in d.migrationDataFromDisk) {
        if (filenames.indexOf(filename) == -1) {
          filenames.push(filename);
        }
      }

      async.map(filenames, function(filename, cb) {

        var dataFromDisk = d.migrationDataFromDisk[filename];
        var dataFromDb   = d.migrationDataFromDb[filename];

        async.auto({

          migration: [function(cb) {
            var _cb = cb;

            if (dataFromDb) {
              var migration = new _this(dataFromDb);
              migration.isNew = false;
              return cb(null, migration);
            }

            (new _this({
              filename    : dataFromDisk.filename,
              name        : dataFromDisk.name,
              description : dataFromDisk.description,
              isReversible: dataFromDisk.isReversible,
              isIgnored   : dataFromDisk.isIgnored,
              src         : dataFromDisk.src,
              isApplied   : false,
              appliedAt   : null,
              rolledBackAt: null
            })).save(cb);
          }],

          hasUpdatedMigration: ['migration', function(cb, d) {
            var _cb = cb;
            cb = function() {
              return _cb.apply(this, arguments);
            };

            if (!dataFromDisk || !dataFromDb || (
              d.migration.name         === dataFromDisk.name &&
              d.migration.description  === dataFromDisk.description &&
              d.migration.isReversible === dataFromDisk.isReversible &&
              d.migration.isIgnored    === dataFromDisk.isIgnored &&
              d.migration.src          === dataFromDisk.src
            )) { return cb(null, false); }

            d.migration.name         = dataFromDisk.name;
            d.migration.description  = dataFromDisk.description;
            d.migration.isReversible = dataFromDisk.isReversible;
            d.migration.isIgnored    = dataFromDisk.isIgnored;
            d.migration.src          = dataFromDisk.src;

            d.migration.save(function(err) {
              if (err) { return cb(err); }
              cb(null, true);
            });
          }],

          hasWrittenMigrationToDisk: ['migration', function(cb, d) {
            var _cb = cb;
            cb = function() {
              return _cb.apply(this, arguments);
            };

            if (!opts.sync || dataFromDisk) {
              return cb(null, false);
            }

            var next = function(err) {
              if (err) { return cb(err); }
              var migrationPath = path.join(_this.migrationsPath, filename);
              fs.writeFile(migrationPath, d.migration.src, function(err) {
                if (err) { return cb(err); }
                cb(null, true);
              });
            };

            var stop = function(err) {
              if (err) { return cb(err); }
              if (!d.migration.isApplied) {
                return cb(new Error('Declined to write unapplied migration to disk'));
              }
              cb(null, false);
            };

            (opts.confirmWriteToDisk || _this.confirmWriteToDisk)(d.migration, next, stop);
          }]
        }, function(err, d) {
          if (err) { return cb(err); }
          cb(null, d.migration);
        });
      }, function(err, migrations) {
        cb(err, migrations);
      });
    }]
  }, function(err, d) {
    if (err) { return cb(err); }

    var migrations = d.migrations.filter(function(migration) {
      return !migration.isIgnored;
    }).sort(function(a, b) {
      return a.fileName > b.fileName ? 1 : -1;
    });

    cb(null, migrations);
  });
};

Migration.prototype.save = function(cb) {
  var _this = this;

  if (this.isNew) {
    this.constructor.driver.createMigration({
      filename    : this.filename,
      name        : this.name,
      description : this.description,
      isReversible: this.isReversible,
      src         : this.src,
      isIgnored   : this.isIgnored,
      isApplied   : this.isApplied,
      appliedAt   : this.appliedAt,
      rolledBackAt: this.rolledBackAt
    }, function(err) {
      if (err) { return cb(err); }
      _this.isNew = false;
      cb(null, _this);
    });
  } else {
    this.constructor.driver.updateMigration(this.filename, {
      name        : this.name,
      description : this.description,
      isReversible: this.isReversible,
      src         : this.src,
      isIgnored   : this.isIgnored,
      isApplied   : this.isApplied,
      appliedAt   : this.appliedAt,
      rolledBackAt: this.rolledBackAt
    }, function(err) {
      if (err) { return cb(err); }
      cb(null, _this);
    });
  }
};

Migration.prototype.up = function(opts, cb) {
  var _this = this;
  this._migrate('up', opts, function(err) {
    if (err) { return cb(err); }
    _this.isApplied = true;
    _this.appliedAt = new Date();
    _this.save(function(err) {
      if (err) { return cb(err); }
      cb(null);
    });
  });
};

Migration.prototype.down = function(opts, cb) {
  var _this = this;
  this._migrate('down', opts, function(err) {
    if (err) { return cb(err); }
    _this.isApplied    = false;
    _this.rolledBackAt = new Date();
    _this.save(function(err) {
      if (err) { return cb(err); }
      cb(null);
    });
  });
};

Migration.prototype._migrate = function(direction, opts, cb) {
  var context = vm.createContext(opts.context);
  this._compileModule(this.src, context)[direction](opts.db, cb);
};

Migration.prototype._compileModule = function(src, context) {
  var migrationPath  = path.join(this.constructor.migrationsPath, this.filename);
  var script         = new vm.Script(this._wrapSrc(src), migrationPath);
  var compiledModule = script.runInContext(context);
  var moduleObj      = { exports: {} };

  var requireFn = function() {
    throw new Error('require cannot be called within a migration');
  };

  compiledModule(moduleObj.exports, requireFn, moduleObj, this.filename, '');

  return moduleObj.exports;
};

Migration.prototype._wrapSrc = function(src) {
  return '(function (exports, require, module, __filename, __dirname) { ' +
    src + '\n});';
};


module.exports = Migration;
