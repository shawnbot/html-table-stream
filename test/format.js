var table = require('../'),
    ndjson = require('ndjson');

process.stdin
  .pipe(ndjson.parse())
  .pipe(table.format({
    table: {'class': 'foo>bar-baz'},
    indent: '  ',
    columns: ['foo', 'bar', 'baz'],
    format: '${}'
  }))
  .pipe(process.stdout);
