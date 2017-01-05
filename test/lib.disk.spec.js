const assert        = require('assert');
const loadNomadFile = require('./lib/load-nomad-file');
const Disk          = require('../lib/disk');


describe('new Disk(nomadFile) -> disk', () => {


  describe('#getMigrations(cb(err, migrations))', () => {

    let nomadFile;
    beforeEach(cb => loadNomadFile((err, _nomadFile) => {
      if (err) { return cb(err); }
      nomadFile = _nomadFile;
      cb(null);
    }));

    it('calls back with all migrations on disk', (done) => {
      const disk = new Disk(nomadFile);
      disk.getMigrations((err, migrations) => {
        assert.ifError(err);

        assert.equal(migrations.length, 1);

        const [migration] = migrations;

        assert.equal(migration.filename,    '20161004-164518-00.testMigration.js');
        assert.equal(migration.name,        'testMigration');
        assert.equal(migration.description, 'Tests the migration interface');
        assert.equal(migration.isReversible, true);

        done();
      });
    });
  });
});
