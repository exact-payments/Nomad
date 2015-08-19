var MongoClient = require('mongodb').MongoClient;


module.exports = function(nomad) {

  nomad.driver({
    connect: function(cb) {
      var _this = this;

      MongoClient.connect('mongodb://localhost/{{database}}', function(err, db) {
        if (err) { return cb(err); }
        _this.db = db;
        cb(null, db);
      });
    },

    disconnect: function(cb) {
      this.db.close(cb);
    },

    createMigration: function(migration, cb) {
      this.db.collection('{{collection}}').insertOne(migration, cb);
    },

    updateMigration: function(filename, migration, cb) {
      this.db.collection('{{collection}}').updateOne({
        filename: filename
      }, {
        $set: migration
      }, cb);
    },

    getMigrations: function(cb) {
      this.db.collection('{{collection}}').find().toArray(cb);
    }
  });
};
