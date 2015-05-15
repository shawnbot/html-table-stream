var child = require('child_process');
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var getPath = function(filename) {
  return path.join(__dirname, filename);
};

var dirs = fs.readdirSync(__dirname)
  .filter(function(filename) {
    var dir = getPath(filename);
    return fs.statSync(dir).isDirectory()
        && fs.readdirSync(dir).indexOf('test.sh') > -1;
  });

dirs.forEach(function(dir) {
  it(dir, makeTest(dir));
});

function makeTest(dir) {
  return function dirTest(done) {
    var fail = false;
    var opts = {
      cwd: getPath(dir),
      stdio: ['pipe', 'pipe', 'pipe']
    };

    var test = child.spawn('sh', ['test.sh'], opts);
    var diff = child.spawn('diff', ['expected.json', '/dev/stdin'], opts)
      .on('close', exit);

    var buffer = [];
    test.stdout.pipe(diff.stdin);
    diff.stdout.on('data', function(chunk) {
      fail = true;
      buffer.push(chunk);
    });

    function exit(status, signal) {
      if (status > 1) {
        throw new Error('process ' + this.pid + ' exited with ' + status);
      } else if (status || fail) {
        throw new Error('output differs from expected.json:\n' + buffer.join('\n'));
      } else {
        // console.warn('exited with:', status, signal);
      }
      done();
    }
  };
}
