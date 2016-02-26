
var vm        = require('vm');
var fs        = require('fs');
var path      = require('path');
var async     = require('async');
var mkdirp    = require('mkdirp');
var Migration = require('./migration');


function Nomad(opts) {
  this.isReady = false;

  this.context = {
    console      : console,
    setTimeout   : setTimeout,
    setInterval  : setInterval,
    clearTimeout : clearTimeout,
    clearInterval: clearInterval
  };
  this.context.global = this.context;

  this._migrationsPath = '';
  this._driver         = null;
  this._db             = null;
  this._lastIdIndex    = 0;
  this._lastIdTime     = 0;
}

Nomad.templates           = {};
Nomad.templates.base      = fs.readFileSync(path.join(__dirname, '../template/NomadFile.js'), 'utf-8');
Nomad.templates.mongoDb   = fs.readFileSync(path.join(__dirname, '../template/NomadFile-mongodb.js'), 'utf-8');
Nomad.templates.migration = fs.readFileSync(path.join(__dirname, '../template/migration.js'), 'utf-8');

Nomad.logFormatters = {
  json: require('../formatter/json'),
  cli : require('../formatter/cli')
};

Nomad.prototype.init = function(template, cb) {
  var _this = this;

  if (typeof template === 'function') {
    cb = template;
    template = '';
  }

  cb || (cb = function(err) { if (err) { throw err; } });

  var templateName;
  switch (template) {
    case 'mongo':
    case 'mongodb':
      templateName = 'mongoDb';
      break;
    default:
      templateName = 'base';
  }
  var nomadFilePath = path.join(process.cwd(), 'NomadFile.js');

  fs.exists(nomadFilePath, function(isPresent) {
    if (isPresent) {
      return cb(null, {
        templateName: templateName,
        path        : nomadFilePath,
        isNew       : false
      });
    }

    fs.writeFile(nomadFilePath, Nomad.templates[templateName], function(err) {
      if (err) { return cb(err); }
      cb(null, {
        templateName: templateName,
        path        : nomadFilePath,
        isNew       : true
      });
    });
  });
};

Nomad.prototype.driver = function(driver) {
  if (typeof driver.connect !== 'function') {
    throw new Error('driver.connect must be a function');
  }
  if (typeof driver.disconnect !== 'function') {
    throw new Error('driver.disconnect must be a function');
  }
  if (typeof driver.createMigration !== 'function') {
    throw new Error('driver.createMigration must be a function');
  }
  if (typeof driver.updateMigration !== 'function') {
    throw new Error('driver.updateMigration must be a function');
  }
  if (typeof driver.getMigrations !== 'function') {
    throw new Error('driver.getMigrations must be a function');
  }

  this._driver     = driver;
  Migration.driver = driver;
};

Nomad.prototype.create = function(name, description, cb) {
  var _this = this;

  cb || (cb = function(err) { if (err) { throw err; } });

  this._runNomadFile(function(err) {
    if (err) { return cb(err); }

    description || (description = '');

    var fileId             = _this._getId();
    var filename           = fileId + '.' + name + '.js';
    var filePath           = path.join(_this._migrationsPath, filename);
    var escapedName        = name.replace('\'', '\\\'');
    var escapedDescription = description.replace('\'', '\\\'');
    var fileSrc            = Nomad.templates.migration
      .replace('{{name}}'       , escapedName)
      .replace('{{description}}', escapedDescription)
      .replace('{{upFn}}'       , 'function(db, cb) {\n\n}')
      .replace('{{downFn}}'     , 'function(db, cb) {\n\n}');

    mkdirp(_this._migrationsPath, function(err) {
      if (err) { return cb(err); }
      fs.writeFile(filePath, fileSrc, function(err) {
        if (err) { return cb(err); }
        cb(null, {
          name: name,
          path: filePath
        });
      });
    });
  });
};

Nomad.prototype._getId = function() {
  var date = new Date();
  var time = date.getTime();
  var index;
  if (time === this._lastIdTime) {
    index = (this._lastIdIndex += 1).toString();
  } else {
    if (this._lastIdIndex > 0) { this._lastIdIndex = 0; }
    this._lastIdTime = time;
    index = 0;
  }

  var pad = function(len, n) {
    var str = n.toString();
    while (str.length < len) { str = '0' + str; }
    return str;
  };

  return pad(4, date.getFullYear()) + pad(2, date.getMonth() + 1) +
    pad(2, date.getDate()) + '-' + pad(2, date.getHours()) +
    pad(2, date.getMinutes()) + pad(2, date.getSeconds()) + '-' + pad(2, index);
};

Nomad.prototype.log = function(format, cb) {
  var _this     = this;
  var formatter = Nomad.logFormatters[format];

  cb || (cb = function(err) { if (err) { throw err; } });

  if (!formatter) {
    throw new Error(format + ' is not a supported log format');
  }

  this._runNomadFile(function(err) {
    if (err) { throw err; }
    _this._driver.connect(function(err) {
      if (err) { throw err; }
      Migration.getAll(function(err, migrations) {
        if (err) { return cb(err); }
        _this._driver.disconnect(function(err) {
          if (err) { throw err; }
          cb(null, formatter(migrations));
        });
      });
    });
  });
};

Nomad.prototype.migrations = function(cb) {
  var _this     = this;

  cb || (cb = function(err) { if (err) { throw err; } });

  this._runNomadFile(function(err) {
    if (err) { throw err; }
    _this._driver.connect(function(err) {
      if (err) { throw err; }
      Migration.getAll(function(err, migrations) {
        if (err) { return cb(err); }
        _this._driver.disconnect(function(err) {
          if (err) { throw err; }
          cb(null, migrations);
        });
      });
    });
  });
};

Nomad.prototype.up = function(opts, cb) {
  this._migrate('up', opts, cb);
};

Nomad.prototype.down = function(opts, cb) {
  this._migrate('down', opts, cb);
};

Nomad.prototype._migrate = function(direction, opts, cb) {
  var _this = this;

  opts                  || (opts                  = {});
  opts.targetMigration  || (opts.targetMigration  = '');
  opts.confirmMigration || (opts.confirmMigration = function(next) { next(null); });
  cb                    || (cb                    = function(err) { if (err) { throw err; } });

  var count = 0;
  async.series([
    function(cb) { _this._runNomadFile(cb); },
    function(cb) {
      _this._driver.connect(function(err, db) {
        if (err) { return cb(err); }
        _this.db = db;
        cb(null);
      });
    },
    function(cb) {
      Migration.getAll(function(err, migrations) {
        if (err) { return cb(err); }

        if (direction === 'down') {
          migrations.reverse();
        }

        var intendedAppliedState = direction === 'down';
        var endOfFilterFound     = false;
        migrations = migrations.filter(function(migration, index) {

          // all migrations following the target are ignored
          if (endOfFilterFound) { return false; }

          // if this migration does not match the desired is applied state then
          // filter it out
          if (intendedAppliedState !== migration.isApplied) {
            return false;
          }

          // if this migration is the target then include it but no more after by
          // setting endOfFilterFound to true
          if (
            opts.targetMigration === migration.filename ||
            opts.targetMigration === migration.name
          ) {
            endOfFilterFound = true;
          }

          return true;
        });

        if (!endOfFilterFound && opts.targetMigration) {
          return cb(new Error(
            opts.targetMigration + ' is not a valid target to an ' + direction +
            ' migration'
          ));
        }

        var isAborted = false;
        async.eachSeries(migrations, function(migration, cb) {
          if (isAborted) { return cb(null); }

          opts.confirmMigration(migration, function(err, ok) {
            if (err) { return cb(err); }

            if (ok === false) {
              isAborted = true;
              return cb(null);
            }

            count += 1;
            migration[direction]({
              context: _this.context,
              db     : _this.db
            }, cb);
          });
        }, cb);
      }, cb);
    },
    function(cb) {
      _this._driver.disconnect(function(err, db) {
        if (err) { return cb(err); }
        _this.db = null;
        cb(null);
      });
    }
  ], function(err) {
    if (err) { return cb(err); }
    cb(null, count);
  });
};

Nomad.prototype._runNomadFile = function(cb) {
  var _this = this;

  this._findNomadFileAndMigrationsPath(function(err, nomadFilePath, migrationsPath) {

    if (!nomadFilePath) {
      throw new Error('NomadFile.js not found. Please run nomad init first');
    }

    _this._migrationsPath    = migrationsPath;
    Migration.migrationsPath = migrationsPath;
    require(nomadFilePath)(_this);

    if (!_this._driver) {
      return cb(new Error('No driver has been set. Please set one in your NomadFile.js'));
    }

    cb(null);
  });
};

Nomad.prototype._findNomadFileAndMigrationsPath = function(cb) {
  var pathChunks     = process.cwd().split(path.sep).slice(1);
  var nomadFilePath  = '';
  var migrationsPath = '';

  async.doWhilst(function(cb) {
    var currentPath           = path.sep + path.join.apply(path, pathChunks);
    var currentNomadFilePath  = path.join(currentPath, 'NomadFile.js');
    var currentMigrationsPath = path.join(currentPath, 'migrations');

    fs.exists(currentNomadFilePath, function(isPresent) {

      if (!isPresent) {
        pathChunks.pop();
        return cb(null);
      }

      nomadFilePath  = currentNomadFilePath;
      migrationsPath = currentMigrationsPath;
      cb(null);
    });
  }, function() {
    return nomadFilePath === '' && pathChunks.length > 0;
  }, function() {
    cb(null, nomadFilePath, migrationsPath);
  });
};

module.exports = Nomad;
