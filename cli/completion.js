
var nomad = require('../');


module.exports = function(current, argv, cb) {
  var commandName = argv._[1];

  if (commandName === 'up' || commandName === 'down') {
    return migrationNames(cb);
  }

  cb(['init', 'create', 'up', 'down', 'log']);
};


function migrationNames(cb) {
  nomad.migrations(function(err, migrations) {
    if (err) { throw err; }
    cb(migrations.map(function(migration) {
      return migration.filename;
    }));
  });
}
