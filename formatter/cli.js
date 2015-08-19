
var chalk        = require('chalk');
var Table        = require('cli-table');
var relativeDate = require('relative-date');

module.exports = function(migrations) {

  var table = new Table({
    head: [
      'Name',
      'Is Applied',
      'Applied At',
      'Rolled Back At',
      'Filename'
    ],
    style: {
      head   : ['cyan'],
      border : ['white'],
      compact: true
    }
  });

  migrations.reverse();

  for (var i = 0; i < migrations.length; i += 1) {

    var primaryColor = function(str) {
      var color = migrations[i].isApplied ? 'cyan' : 'white';
      return chalk[color](str);
    };

    var secondaryColor = function(str) {
      var color = migrations[i].isApplied ? 'white' : 'grey';
      return chalk[color](str);
    };

    var fixDate = function(date) {
      return date ? relativeDate(date) : 'Never';
    }

    table.push([
      primaryColor(migrations[i].name),
      secondaryColor(migrations[i].isApplied),
      secondaryColor(fixDate(migrations[i].appliedAt)),
      secondaryColor(fixDate(migrations[i].rolledBackAt)),
      secondaryColor(migrations[i].filename)
    ]);
  }

  return table.toString();
};
