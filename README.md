# html-table-stream
Read and write HTML tables as data in Node.

Install it with [npm]:

```sh
npm install html-table-stream
```

Now you can parse some HTML tables, for example, [US state FIPS
codes](http://www.epa.gov/envirofw/html/codes/state.html):

```js
var table = require('html-table-stream');
var request = require('request');
var ndjson = require('ndjson');

request('http://www.epa.gov/envirofw/html/codes/state.html')
  .pipe(table.parse())
  .pipe(ndjson.stringify())
  .pipe(process.stdout);
```

[npm]: https://www.npmjs.com/
