
var path  = require('path');
var chalk = require('chalk');
var nomad = require('../');


module.exports = function() {
  console.log();
  console.log(chalk.white.bold('Initialize Nomad'));
  console.log();

  nomad.init(function(err, result) {
    if (err) { throw err; }
    var nomadFilePath = path.relative(process.cwd(), result.path);
    if (result.isNew) {
      console.log('Nomad file created at ' + chalk.cyan('./' + nomadFilePath));
    } else {
      console.log('Nomad file already exists at ' + chalk.cyan('./' + nomadFilePath));
    }
  });
};
