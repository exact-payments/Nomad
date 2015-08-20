
var readFileSync = require('fs').readFileSync;
var pathJoin     = require('path').join;
var yargs        = require('yargs');
var completion   = require('./completion');
var epilogueText = readFileSync(pathJoin(__dirname, 'epilogue.txt'), 'utf8');

var init   = require('./init');
var create = require('./create');
var up     = require('./up');
var down   = require('./down');
var log    = require('./log');

yargs.usage('Usage: $0 <command>')
    .demand(1)
    .command('init'  , 'Create a NomadFile.js in the current directory', init)
    .command('create', 'Create a new migration in the migrations directory', create)
    .command('up'    , 'Apply pending migrations', up)
    .command('down'  , 'Rollback to a previous migration', down)
    .command('log'   , 'Display a log of all migrations', log)
    .completion('completion', completion)
    .alias('h', 'help')
    .help('h')
    .epilogue(epilogueText.replace(/([^\n])\n([^\n])/g, '$1 $2'))
    .parse(process.argv);
