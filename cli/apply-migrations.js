/* eslint-disable no-console */
const nomad = require('../');


const target = process.argv[3][0] !== '-' ? process.argv[3] : '';

const onApplyMigration = (migration) => {
  console.log(`applying migration ${migration.name}`);
};

const onAppliedMigration = (migration) => {
  console.log(`applied migration ${migration.name}`);
};

const onReverseMigration = (migration) => {
  console.log(`reversing migration ${migration.name}`);
};

const onReversedMigration = (migration) => {
  console.log(`reversed migration ${migration.name}`);
};

const canReverseDevergentMigrations = () => {
  console.log('CHECK IF CAN REVERSE DEVERGENT MIGRATION');
  return true;
};

const canApplyUnreversibleMigration = () => {
  console.log('CHECK IF CAN APPLY UNREVERSIBLE MIGRATION');
  return true;
};

const applyMigrations = () => {
  console.log(`Applying pending migrations${target ? ` up to ${target}` : ''}`);

  nomad.up(target, {
    onApplyMigration,
    onAppliedMigration,
    onReverseMigration,
    onReversedMigration,
    canReverseDevergentMigrations,
    canApplyUnreversibleMigration,
  }, (err) => {
    if (err) { throw err; }

    console.log('Process complete');
  });
};


module.exports = applyMigrations;
