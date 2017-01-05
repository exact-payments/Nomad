/* eslint-disable no-console */
const nomad = require('../');


const target = process.argv[3][0] !== '-' ? process.argv[3] : '';

const onReverseMigration = (migration) => {
  console.log(`reversing migration ${migration.name}`);
};

const onReversedMigration = (migration) => {
  console.log(`reversed migration ${migration.name}`);
};

const applyMigrations = () => {
  nomad.up(target, {
    onReverseMigration,
    onReversedMigration,
  }, (err) => {
    if (err) { throw err; }

    console.log('Process complete');
  });
};


module.exports = applyMigrations;
