var yargs = require('yargs')
  .boolean('verbose')
  .alias('verbose', 'v');
var options = yargs.argv;
var table = require('../');
var ndjson = require('ndjson');

process.stdin
  .pipe(table.parse(options))
  .pipe(ndjson.stringify())
  .pipe(process.stdout);
