/* eslint-disable no-console */
const nomad = require('../');
const path  = require('path');

const applyMigrations   = require('./apply-migrations');
const reverseMigrations = require('./reverse-migrations');
const displayHelpText   = require('./display-help-text');


const commad = process.argv[2];

const configFlagIndex = process.argv.slice(3).findIndex(a => a === '-C' || a === '--config');
const nomadFilePath   = path.join(process.cwd(), configFlagIndex > -1 ?
  process.argv[configFlagIndex + 4] :
  'NomadFile.js');


nomad.loadNomadFileByPath(nomadFilePath, {}, (err) => {
  if (err) {
    console.log(`Failed to read nomad config module from ${nomadFilePath}`);
    return;
  }

  switch (commad) {
  case 'up'  : applyMigrations();   break;
  case 'down': reverseMigrations(); break;
  default    : displayHelpText();
  }
});
