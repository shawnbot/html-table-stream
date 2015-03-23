var table = require('../'),
    fs = require('fs'),
    ndjson = require('ndjson');

fs.createReadStream(__dirname + '/html/bigdoc.html')
  .pipe(table.parse({
    selector: 'table.statistics'
  }))
  .pipe(ndjson.stringify())
  .pipe(process.stdout);
