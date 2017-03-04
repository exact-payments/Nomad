var MongoClient = require('mongodb').MongoClient;


// Remember to set these values to match your application's database
var DATABASE_URL              = 'mongodb://localhost/my-app';
var MIGRATION_COLLECTION_NAME = 'migrations';


module.exports = function(nomad) {

  nomad.driver({
    connect: function(cb) {
      var _this = this;

      MongoClient.connect(DATABASE_URL, function(err, db) {
        if (err) { return cb(err); }
        _this.db = db;
        cb(null, db);
      });
    },

    disconnect: function(cb) {
      this.db.close(cb);
    },

    createMigration: function(migration, cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).insertOne(migration, cb);
    },

    updateMigration: function(filename, migration, cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).updateOne({
        filename: filename
      }, {
        $set: migration
      }, cb);
    },

    getMigrations: function(cb) {
      this.db.collection(MIGRATION_COLLECTION_NAME).find().toArray(cb);
    }
  });
};
