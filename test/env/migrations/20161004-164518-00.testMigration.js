exports.name         = 'testMigration';
exports.description  = 'Tests the migration interface';

exports.isReversible = true;
exports.isIgnored    = false;


exports.up = function(db, done) {
  done();
};

exports.down = function(db, done) {
  done();
};
