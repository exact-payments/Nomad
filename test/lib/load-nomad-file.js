const path      = require('path');
const NomadFile = require('../../lib/nomad-file');


module.exports = (cb) => {
  NomadFile.fromPath(path.join(__dirname, '../env/NomadFile.js'), {}, cb);
};
