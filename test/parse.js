var table = require('../'),
    ndjson = require('ndjson');

process.stdin
  .pipe(table.parse({
  }))
  .pipe(ndjson.stringify())
  .pipe(process.stdout);
