const sinon                   = require('sinon');
const dbApi                   = require('../mock/db-api');
const migrationRecordsFixture = require('../fixture/migration-records');


module.exports = (n) => {
  n.driver({
    connect        : sinon.stub().callsArgWith(0, null, dbApi),
    disconnect     : sinon.stub().callsArgWith(0, null),
    insertMigration: sinon.stub().callsArgWith(1, null),
    getMigrations  : sinon.stub().callsArgWith(0, null, migrationRecordsFixture),
    updateMigration: sinon.stub().callsArgWith(2, null),
    removeMigration: sinon.stub().callsArgWith(1, null),
  });
};
