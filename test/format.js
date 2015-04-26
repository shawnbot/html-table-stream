var table = require('../'),
    ndjson = require('ndjson');

process.stdin
  .pipe(ndjson.parse())
  .pipe(table.format({
    table: {'class': 'foo>bar-baz'},
    indent: '  ',
    columns: ['foo', 'bar', 'baz']
  }))
  .pipe(process.stdout);
