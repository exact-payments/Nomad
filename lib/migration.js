
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
  this.isApplied    = record.isApplied    || false;
  this.isIgnored    = record.isIgnored    || false;
  this.isReversible = record.isReversible || null;
  this.appliedAt    = record.appliedAt    || null;
  this.rolledBackAt = record.rolledBackAt || null;
}

Migration.driver         = null;
Migration.migrationsPath = '';

Migration.getAll = function(cb) {
  var _this = this;
  if (!this.driver) { throw new Error('Migration.driver not set'); }

  async.parallel({
    dataFromDisk: function(cb) {
      Migration._getAllMigrationDataFromDisk(cb);
    },
    dataFromDb: function(cb) {
      Migration._getAllMigrationDataFromDb(cb);
    }
  }, function(err, d) {
    if (err) { return cb(err); }

    async.map(Object.keys(d.dataFromDisk), function(filename, cb) {

      var dataFromDb   = d.dataFromDb[filename];
      var dataFromDisk = d.dataFromDisk[filename];


      if (dataFromDb) {
        var migration = new _this(dataFromDb);

        migration.isNew = false;

        if (
          dataFromDb.name         !== dataFromDisk.name ||
          dataFromDb.description  !== dataFromDisk.description ||
          dataFromDb.isReversible !== dataFromDisk.isReversible
        ) {
          migration.name         = dataFromDisk.name;
          migration.description  = dataFromDisk.description;
          migration.isReversible = dataFromDisk.isReversible;

          return migration.save(cb);
        }

        return cb(null, migration);
      }

      (new _this({
        filename    : filename,
        name        : dataFromDisk.name,
        description : dataFromDisk.description,
        isReversible: dataFromDisk.isReversible,
        isApplied   : false,
        appliedAt   : null,
        rolledBackAt: null
      })).save(cb);
    }, function(err, migrations) {
      if (err) { return cb(err); }
      cb(null, migrations.sort(function(a, b) {
        return a.fileName > b.fileName ? 1 : -1;
      }));
    });
  });
};

Migration._getAllMigrationDataFromDb = function(cb) {
  this.driver.getMigrations(function(err, records) {
    var migrationData = {};
    for (var i = 0; i < records.length; i += 1) {
      migrationData[records[i].filename] = records[i];
    }
    cb(null, migrationData);
  });
};

Migration._getAllMigrationDataFromDisk = function(cb) {
  var _this = this;

  var dataFromDisk = {};
  fs.readdir(Migration.migrationsPath, function(err, filenames) {
    if (err) { return cb(err); }

    for (var i = 0; i < filenames.length; i += 1) {
      var migrationPath   = path.join(_this.migrationsPath, filenames[i]);
      var migrationModule = require(migrationPath);

      if (migrationModule.isIgnored) { continue; }

      dataFromDisk[filenames[i]] = {
        filename    : filenames[i],
        name        : migrationModule.name         || filename,
        description : migrationModule.description  || '',
        isReversible: migrationModule.isReversible || null
      };
    }

    cb(null, dataFromDisk);
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
  var _this = this;
  var migrationPath = path.join(this.constructor.migrationsPath, this.filename);
  var context       = vm.createContext(opts.context);
  fs.readFile(migrationPath, 'utf-8', function(err, src) {
    _this._compileModule(src, context)[direction](opts.db, cb);
  });
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
