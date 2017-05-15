const fs             = require('fs');
const path           = require('path');
const async          = require('async');
const NomadFile      = require('./nomad-file');
const Disk           = require('./disk');
const Database       = require('./database');
const Migration      = require('./migration');
const MigrationError = require('./migration-error');


const noop = (err) => {
  if (err) { throw err; }
};

class Nomad {

  constructor() {
    this.disk                = null;
    this.database            = null;
    this.nomadFile           = null;
    this._lastTimestampTime  = null;
    this._lastTimestampIndex = 0;
    this._migrationTemplate  = '';
  }

  up(target, opts = {}, cb = noop) {
    if (!this.nomadFile) {
      return cb(new MigrationError(
        'nomadFileNotLoaded',
        'Cannot apply migrations. NomadFile not yet loaded.'
      ));
    }

    if (target && typeof target === 'object') {
      opts   = target;
      target = undefined;
    }

    /* eslint-disable max-len */
    const onApplyMigration              = opts.onApplyMigration              || (() => {});
    const onAppliedMigration            = opts.onAppliedMigration            || (() => {});
    const onReverseMigration            = opts.onReverseMigration            || (() => {});
    const onReversedMigration           = opts.onReversedMigration           || (() => {});
    const canApplyMigrations            = opts.canApplyMigrations            || ((m, cb) => cb(true));
    const canReverseDivergentMigrations = opts.canReverseDivergentMigrations || ((m, cb) => cb(true));
    const canApplyIrreversibleMigration = opts.canApplyIrreversibleMigration || ((m, cb) => cb(true));
    /* eslint-enable max-len */

    this.getMigrations((err, migrations) => {
      if (err) { return cb(err); }

      let pendingMigrations;
      if (target) {
        const targetIndex = migrations.unapplied.findIndex(m =>
          m.name === target || m.filename === target);

        if (targetIndex === -1) {
          return cb(new MigrationError(
            'invaildMigrationTarget',
            `Cannot perform up command. The target ${target} is not a pending migration.`
          ));
        }

        pendingMigrations = migrations.unapplied.slice(0, targetIndex + 1);
      } else {
        pendingMigrations = migrations.unapplied;
      }

      const applyPendingMigrations = (cb) => {
        async.each(pendingMigrations, (migration, cb) => {
          if (migration.isReversible) { return cb(null); }
          canApplyIrreversibleMigration(migration, (ok) => {
            if (ok) { return cb(null); }
            cb(new MigrationError(
              'abortIrreversibleMigration',
              'Cannot perform up command. Irreversible migration aborted.'
            ));
          });
        }, (err) => {
          if (err) { return cb(err); }

          async.eachSeries(pendingMigrations, (migration, cb) => {
            onApplyMigration(migration);
            this._execMigration('up', migration, (err) => {
              if (err) { return cb(err); }
              onAppliedMigration(migration);
              cb(null);
            });
          }, cb);
        });
      };

      const reverseDivergentMigrations = (cb) => {
        if (migrations.divergent < 1) { return cb(null); }
        async.eachSeries(migrations.divergent, (migration, cb) => {
          onReverseMigration(migration);
          this._execMigration('down', migration, (err) => {
            if (err) { return cb(err); }
            onReversedMigration(migration);
            cb(null);
          });
        }, cb);
      };

      const checkDivergentMigrations = (cb) => {
        if (migrations.divergent.length < 1) { return cb(null); }

        if (migrations.divergent.some(m => !m.isReversible)) {
          return cb(new MigrationError(
            'irreversibleDivergentMigration',
            'Cannot perform up command. A divergent migration cannot reversed. Manual ' +
            'intervention required.'
          ));
        }

        canReverseDivergentMigrations(migrations.divergent, (ok) => {
          if (!ok) {
            return cb(new MigrationError(
              'abortReverseDivergentMigration',
              'Cannot perform up command. Reversal of divergent migrations aborted.'
            ));
          }
          cb(null);
        });
      };

      const checkPendingMigrations = (cb) => {
        if (pendingMigrations.length < 1) { return cb(null); }
        canApplyMigrations(pendingMigrations, (ok) => {
          if (ok) { return cb(null); }
          cb(new MigrationError(
            'abortApplyMigration',
            'Cannot perform up command. Application of migrations aborted.'
          ));
        });
      };

      checkDivergentMigrations((err) => {
        if (err) { return cb(err); }
        checkPendingMigrations((err) => {
          if (err) { return cb(err); }
          reverseDivergentMigrations((err) => {
            if (err) { return cb(err); }
            applyPendingMigrations(cb);
          });
        });
      });
    });
  }

  down(target, opts = {}, cb = noop) {
    if (!this.nomadFile) {
      return cb(new MigrationError(
        'nomadFileNotLoaded',
        'Cannot reverse migrations. NomadFile not yet loaded.'
      ));
    }

    if (!target) {
      return cb(new MigrationError(
        'invaildMigrationTarget',
        'Cannot reverse migrations. A target is required.'
      ));
    }

    const onReverseMigration   = opts.onReverseMigration   || (() => {});
    const onReversedMigration  = opts.onReversedMigration  || (() => {});
    const canReverseMigrations = opts.canReverseMigrations || ((m, cb) => cb(true));

    this.getMigrations((err, migrations) => {
      if (err) { return cb(err); }

      let appliedMigrations = [].concat(migrations.divergent, migrations.applied);

      const targetIndex = appliedMigrations.findIndex(m =>
        m.name === target || m.filename === target);

      if (targetIndex === -1) {
        return cb(new MigrationError(
          'invaildMigrationTarget',
          `Cannot perform down command. The target ${target} is not a applied migration.`
        ));
      }

      appliedMigrations = appliedMigrations.slice(0, targetIndex + 1);

      for (const migration of appliedMigrations) {
        if (!migration.isReversible) {
          return cb(new MigrationError(
            'irreversibleMigration',
            `Cannot perform down command. Migration ${migration.name} is irreversible. Manual ` +
            'intervention required.'
          ));
        }
      }

      canReverseMigrations(appliedMigrations, (ok) => {
        if (!ok) {
          return cb(new MigrationError(
            'abortReverseMigration',
            'Cannot perform down command. Reversal of migrations aborted.'
          ));
        }

        async.eachSeries(appliedMigrations, (migration, cb) => {
          onReverseMigration(migration);
          this._execMigration('down', migration, (err) => {
            if (err) { return cb(err); }
            onReversedMigration(migration);
            cb(null);
          });
        }, cb);
      });
    });
  }

  setHead(target, opts, cb) {
    if (!this.nomadFile) {
      return cb(new MigrationError(
        'nomadFileNotLoaded',
        'Cannot set head migration. NomadFile not yet loaded.'
      ));
    }

    this.database.getMigrations((err, migrations) => {
      if (err) { return cb(err); }

      let migrationsToMarkApplied;
      let migrationsToMarkUnapplied;
      if (target !== '-') {
        const targetMigrationIndex = migrations.findIndex(m =>
          m.name === target || m.filename === target) + 1;

        if (targetMigrationIndex < 1) {
          return cb(new MigrationError(
            'invaildMigrationTarget',
            `Cannot set head migration. The target ${target} migration does not exist in the ` +
            'database.'
          ));
        }

        migrationsToMarkApplied   = migrations.slice(0, targetMigrationIndex);
        migrationsToMarkUnapplied = migrations.slice(targetMigrationIndex);
      } else {
        migrationsToMarkApplied   = [];
        migrationsToMarkUnapplied = migrations;
      }

      const canMarkMigrations = opts.canMarkMigrations || ((mU, mA, cb) => cb(true));

      canMarkMigrations(migrationsToMarkUnapplied, migrationsToMarkApplied, (ok) => {
        if (!ok) {
          return cb(new MigrationError(
            'abortUnmarkMigration',
            'Cannot perform set-head command. Unmarking of migrations aborted.'
          ));
        }

        for (const migration of migrationsToMarkApplied) {
          if (migration.appliedAt) { continue; }
          migration.appliedAt  = new Date();
          migration.appliedSrc = migration.src;
        }
        for (const migration of migrationsToMarkUnapplied) {
          if (!migration.appliedAt) { continue; }
          migration.appliedAt  = null;
          migration.appliedSrc = null;
        }

        const updatedMigrations = [].concat(migrationsToMarkApplied, migrationsToMarkUnapplied);

        async.each(updatedMigrations, (migration, cb) => {
          this.database.updateMigration(migration, (err) => {
            if (err) {
              return cb(new MigrationError(
                'updateMigrationFailed',
                `Failed to update migration ${migration.filename}: ${err.stack}`
              ));
            }

            cb(null);
          });
        }, cb);
      });
    });
  }

  getMigrations(cb = noop) {
    this.database.getMigrations((err, migrations) => {
      if (err) { return cb(err); }

      const headIndex = migrations.findIndex(m =>
        !m.currentMigrationModule || !m.appliedMigrationModule || (
          m.currentMigrationModule && m.appliedMigrationModule && (
            m.currentMigrationModule.up.toString()   !== m.appliedMigrationModule.up.toString() ||
            m.currentMigrationModule.down.toString() !== m.appliedMigrationModule.down.toString()
          )
        )
      );

      if (headIndex === -1) {
        return cb(null, { unapplied: [], divergent: [], applied: migrations.reverse() });
      }

      const unapplied = migrations.slice(headIndex).filter(m => !m.appliedMigrationModule);
      const divergent = migrations.slice(headIndex).filter(m => !!m.appliedMigrationModule);
      const applied   = migrations.slice(0, headIndex).reverse();

      unapplied.unshift(...divergent.filter(m => !!m.currentMigrationModule));
      divergent.reverse();

      cb(null, { unapplied, divergent, applied });
    });
  }

  syncDatabaseAndDisk(cb = noop) {
    if (!this.nomadFile) {
      return cb(new MigrationError(
        'nomadFileNotLoaded',
        'Cannot perform logs command. NomadFile not yet loaded.'
      ));
    }

    async.parallel({
      diskMigrations    : cb => this.disk.getMigrations(cb),
      databaseMigrations: cb => this.database.getMigrations(cb),
    }, (err, d) => {
      if (err) { return cb(err); }

      const updatedMigrations = [];
      const { diskMigrations, databaseMigrations } = d;

      for (const databaseMigration of databaseMigrations) {
        const diskMigration = diskMigrations.find(m => m.filename === databaseMigration.filename);

        // NOTE: clear the src indicating that the migration was deleted from
        // disk.
        if (!diskMigration) {
          databaseMigration.src = '';
          updatedMigrations.push(databaseMigration);
          continue;
        }

        let isUpdated = false;
        for (const prop of ['src', 'description', 'isReversable']) {
          if (databaseMigration[prop] !== diskMigration[prop]) {
            databaseMigration[prop] = diskMigration[prop];
            isUpdated               = true;
          }
        }
        if (isUpdated || databaseMigration._isOldRecord) {
          updatedMigrations.push(databaseMigration);
        }
      }

      const newMigrations = diskMigrations.filter(dkM =>
        !databaseMigrations.find(dbM => dbM.filename === dkM.filename));

      async.parallel([
        cb => async.each(newMigrations, (m, cb) => this.database.insertMigration(m, cb), cb),
        cb => async.each(updatedMigrations, (m, cb) => this.database.updateMigration(m, cb), cb),
      ], cb);
    });
  }

  loadNomadFileByPath(path, opts = {}, cb = noop) {
    NomadFile.fromPath(path, opts, (err, nomadFile) => {
      if (err) { return cb(err); }
      this.nomadFile = nomadFile;
      this.database  = new Database(this.nomadFile);
      this.disk      = new Disk(this.nomadFile);
      this.database.connect(cb);
    });
  }

  unloadNomadFile(cb = noop) {
    this.database.disconnect(cb);
    this.nomadFile = null;
    this.database  = null;
    this.disk      = null;
  }

  createNomadFile(path, opts = {}, cb = noop) {
    NomadFile.create(opts, opts, (err, nomadFile) => {
      if (err) { return cb(err); }
      this.nomadFile = nomadFile;
      this.database  = new Database(this.nomadFile);
      this.disk      = new Disk(this.nomadFile);
      cb(null);
    });
  }

  writeMigration(opts, cb = noop) {
    if (!this.nomadFile) {
      return cb(new MigrationError(
        'nomadFileNotLoaded',
        'Cannot write migration. NomadFile not yet loaded.'
      ));
    }

    const filenameTimestamp = this._generateFilenameTimestamp();
    const filename          = `${filenameTimestamp}.${opts.name}.js`;

    const escapedName        = opts.name.replace('\'', '\\\'');
    const escapedDescription = opts.description.replace('\'', '\\\'');

    this._loadMigrationTemplate((err, template) => {
      const src = template
        .replace('{{name}}', escapedName)
        .replace('{{description}}', escapedDescription);
      const migration = new Migration(this.nomadFile, {
        filename,
        src,
      });
      this.disk.writeMigration(migration, cb);
    });
  }

  _generateFilenameTimestamp() {
    const date = new Date();
    const time = date.getTime();

    let index;
    if (time === this._lastTimestampTime) {
      index = (this._lastTimestampIndex += 1).toString();
    } else {
      if (this._lastTimestampIndex > 0) { this._lastTimestampIndex = 0; }
      this._lastTimestampTime = time;
      index = 0;
    }

    const pad = (len, n) => {
      let str = n.toString();
      while (str.length < len) { str = `0${str}`; }
      return str;
    };

    return [
      pad(4, date.getFullYear()) + pad(2, date.getMonth() + 1) + pad(2, date.getDate()),
      pad(2, date.getHours())    + pad(2, date.getMinutes())   + pad(2, date.getSeconds()),
      pad(2, index),
    ].join('-');
  }

  _execMigration(mode, migration, cb) {
    const handleError = (err) => {

      migration.failedAt   = new Date();
      migration.errorStack = err.stack;

      this.database.updateMigration(migration, (_err) => {
        if (_err) {
          return cb(new MigrationError(
            'updateMigrationFailed',
            `Failed to update migration ${migration.filename} after failing to execute ${mode} ` +
            `migration: ${_err.stack}`
          ));
        }

        cb(new MigrationError(
          `${mode}ExecMigrationFailed`,
          `Failed to execute ${mode} for migration ${migration.filename}: ${err.stack}`
        ));
      });
    };

    const onExec = (err) => {
      if (err) { return handleError(err); }

      migration.failedAt   = null;
      migration.errorStack = null;

      if (mode === 'up') {
        migration.appliedAt  = new Date();
        migration.appliedSrc = migration.src;
      } else {
        migration.appliedAt  = null;
        migration.appliedSrc = null;
      }

      if (mode === 'down' && !migration.src) {
        return this.database.removeMigration(migration, (err) => {
          if (err) {
            return cb(new MigrationError(
              'removeMigrationFailed',
              `Failed to remove divergent migration ${migration.filename} no longer on disk ` +
              `after successfully executing down migration: ${err.stack}`
            ));
          }

          cb(null);
        });
      }

      this.database.updateMigration(migration, (err) => {
        if (err) {
          return cb(new MigrationError(
            'updateMigrationFailed',
            `Failed to update migration ${migration.filename} after successfully executing ` +
            `${mode} migration: ${err.stack}`
          ));
        }

        cb(null);
      });
    };

    try {
      migration[mode](this.database.dbApi, onExec);
    } catch (err) {
      return handleError(err);
    }
  }

  _loadMigrationTemplate(cb) {
    if (this._migrationTemplate) { return cb(null, this._migrationTemplate); }
    fs.readFile(path.join(__dirname, '../template/migration.js.tpl'), 'utf8', (err, template) => {
      this._migrationTemplate = template;
      cb(null, template);
    });
  }
}


module.exports = Nomad;
