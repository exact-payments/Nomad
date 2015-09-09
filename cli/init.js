
var path  = require('path');
var chalk = require('chalk');
var nomad = require('../');


module.exports = function(yargs) {
  var argv = yargs.usage('Usage: $0 [type]')
    .example('$0 mongo')
    .example('$0')
    .help('h')
    .argv;

  console.log();
  console.log(chalk.white.bold('Initialize Nomad'));
  console.log();

  nomad.init(argv._[1], function(err, result) {
    if (err) { throw err; }
    var nomadFilePath = path.relative(process.cwd(), result.path);
    if (result.isNew) {
      console.log(
        'Nomad file created at ' + chalk.cyan('./' + nomadFilePath) +
        ' using the ' + chalk.cyan(result.templateName) + ' template'
      );
    } else {
      console.log(
        'Nomad file already exists at ' + chalk.cyan('./' + nomadFilePath)
      );
    }
  });
};
