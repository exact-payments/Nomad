/* eslint-disable max-len */
const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const sinon  = require('sinon');
const Nomad  = require('../lib/nomad');

const nomadFilePath = path.join(__dirname, 'env/NomadFile');


describe('new Nomad(nomadFile) -> disk', () => {


  describe('#up(target, opts, cb(err))', () => {

    it('reverses divergent migrations, deletes them if they don\'t exist anymore on disk, then applies migrations up to and including a given target updating each', (done) => {
      const nomad = new Nomad();

      nomad.loadNomadFileByPath(nomadFilePath, {}, (err) => {
        assert.ifError(err);

        nomad.up('migration-c', {}, (err) => {
          assert.ifError(err);
          done();
        });
      });
    });
  });


  describe('#down(target, opts, cb(err))', () => {

    it('reverses migrations down to and including a given target updating each then deletes any that don\'t exist anymore on disk', (done) => {
      const nomad = new Nomad();

      nomad.loadNomadFileByPath(nomadFilePath, {}, (err) => {
        assert.ifError(err);

        nomad.down('migration-a', {}, (err) => {
          assert.ifError(err);
          done();
        });
      });
    });
  });


  describe('#writeMigration(opts, cb(err))', () => {

    it('accepts opts and writes a migration to disk using those opts', (done) => {
      const nomad = new Nomad();

      nomad.loadNomadFileByPath(nomadFilePath, {}, (err) => {
        assert.ifError(err);

        sinon.spy(nomad.disk, 'writeMigration');
        sinon.stub(fs, 'writeFile').callsArgWith(2, null);

        nomad.writeMigration({
          name       : 'a',
          description: 'description of a',
        }, (err) => {
          assert.ifError(err);

          const writtenMigration = nomad.disk.writeMigration.firstCall.args[0];
          const writtenPath      = fs.writeFile.firstCall.args[0];
          const writtenSrc       = fs.writeFile.firstCall.args[1];

          assert.equal(writtenPath, path.join(__dirname, 'env/migrations', writtenMigration.filename));
          assert.ok(writtenMigration.src);
          assert.equal(writtenMigration.src, writtenSrc);

          done();
        });
      });
    });
  });


  describe('#getMigrations(cb(err, migrations))', () => {

    it('calls back with all migrations from the database organized into applied, divergent, and unapplied', (done) => {
      const nomad = new Nomad();

      nomad.loadNomadFileByPath(nomadFilePath, {}, (err) => {
        assert.ifError(err);

        nomad.getMigrations((err, migrations) => {
          assert.ifError(err);

          assert.equal(migrations.unapplied.length, 3);
          assert.equal(migrations.divergent.length, 2);
          assert.equal(migrations.applied.length, 1);

          const [migrationB, migrationC, migrationD] = migrations.unapplied;
          const [migrationX, migrationB2]            = migrations.divergent;
          const [migrationA]                         = migrations.applied;

          assert.equal(migrationA.name,  'migration-a');
          assert.equal(migrationB.name,  'migration-b');
          assert.equal(migrationB2.name, 'migration-b');
          assert.equal(migrationC.name,  'migration-c');
          assert.equal(migrationX.name,  'migration-x');
          assert.equal(migrationD.name,  'migration-d');

          done();
        });
      });
    });
  });
});
