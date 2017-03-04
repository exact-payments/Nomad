module.exports = function(nomad) {

  nomad.driver({
    connect: function(cb) {
      cb(null, {});
    },

    disconnect: function(cb) {
      cb(null);
    },

    insertMigration: function(migration, cb) {
      cb(null);
    },

    getMigrations: function(cb) {
      cb(null, []);
    },

    updateMigration: function(fileName, migration, cb) {
      cb(null);
    },

    removeMigration: function(fileName, migration, cb) {
      cb(null);
    }
  });
};
