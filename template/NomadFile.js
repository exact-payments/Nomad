module.exports = function(nomad) {

  nomad.driver({
    connect: function(cb) {
      var db = {};
      cb(null, db);
    },

    disconnect: function(cb) {
      cb(null);
    },

    createMigration: function(migration, cb) {
      cb(null);
    },

    updateMigration: function(fileName, migration, cb) {
      cb(null);
    },

    getMigrations: function(cb) {
      var migrations = [];
      cb(null, migrations);
    }
  });
};
