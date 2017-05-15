const Migration = require('./migration');


const noop = (err) => {
  if (err) { throw err; }
};

class Database {

  constructor(nomadFile) {
    this.nomadFile = nomadFile;
    this.dbApi     = null;
  }

  insertMigration(migration, cb = noop) {
    const record = migration.toRecord();
    try {
      this.nomadFile.insertMigrationFn(record, (err) => {
        if (err) {
          return cb(new Error(`Failed to insert migration into the database: ${err.stack}`));
        }
        cb(null);
      });
    } catch (err) {
      cb(new Error(`Failed to insert migration into the database: ${err.stack}`));
    }
  }

  getMigrations(cb = noop) {
    const onMigrations = (err, migrationRecords) => {
      if (err) {
        return cb(new Error(`Failed to connect to the database: ${err.stack}`));
      }
      if (
        !migrationRecords                           ||
        typeof migrationRecords        !== 'object' ||
        typeof migrationRecords.length !== 'number'
      ) {
        return cb(new Error(
          'Driver getMigrations function did not call back with an array of migration records'
        ));
      }

      migrationRecords.sort((a, b) => {
        a = a.filename.toUpperCase();
        b = b.filename.toUpperCase();
        if (a < b) { return -1; }
        if (a > b) { return 1; }
        return 0;
      });

      const migrations = migrationRecords.map((record) => {
        const migration = new Migration(this.nomadFile, record);
        try {
          migration.validate();
        } catch (err) {
          migration.isIgnored  = true;
          migration.errorStack = err.stack;
        }
        return migration;
      });

      // TODO: Add an opt to expose ignored migrations
      cb(null, migrations.filter(m => !m.isIgnored));
    };

    try {
      this.nomadFile.getMigrationsFn(onMigrations);
    } catch (err) {
      return cb(new Error(`Failed to get migrations from the database: ${err.stack}`));
    }
  }

  updateMigration(migration, cb = noop) {
    const record = migration.toRecord();
    try {
      this.nomadFile.updateMigrationFn(migration.filename, record, (err) => {
        if (err) {
          return cb(new Error(`Failed to update migration in the database: ${err.stack}`));
        }
        cb(null);
      });
    } catch (err) {
      cb(new Error(`Failed to update migration in the database: ${err.stack}`));
    }
  }

  removeMigration(migration, cb = noop) {
    try {
      this.nomadFile.removeMigrationFn(migration.filename, (err) => {
        if (err) {
          return cb(new Error(`Failed to remove migration from the database: ${err.stack}`));
        }
        cb(null);
      });
    } catch (err) {
      cb(new Error(`Failed to remove migration from the database: ${err.stack}`));
    }
  }

  connect(cb) {
    if (this.dbApi) { return cb(null); }

    const onConnect = (err, dbApi) => {
      if (err) {
        return cb(new Error(`Failed to connect to the database: ${err.stack}`));
      }
      if (!dbApi || typeof dbApi !== 'object') {
        return cb(new Error('Driver connect function did not call back with dbApi object'));
      }
      this.dbApi = dbApi;
      cb(null);
    };

    try {
      this.nomadFile.connectFn(onConnect);
    } catch (err) {
      return cb(new Error(`Failed to connect to the database: ${err.stack}`));
    }
  }

  disconnect(cb) {
    if (!this.dbApi) { return cb(null); }

    const onDisconnect = (err) => {
      if (err) {
        return cb(new Error(`Failed to disconnect from the database: ${err.stack}`));
      }

      this.dbApi = null;
      cb(null);
    };

    try {
      this.nomadFile.disconnectFn(onDisconnect);
    } catch (err) {
      return cb(new Error(`Failed to disconnect from the database: ${err.stack}`));
    }
  }
}


module.exports = Database;
