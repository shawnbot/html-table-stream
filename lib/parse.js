var htmlparser = require('htmlparser2'),
    dom = require('dom-lite'),
    document = dom.document,
    matcher = require('./matcher'),
    trim = require('trim'),
    extend = require('extend'),
    through2 = require('through2');

module.exports = function parse(options) {
  var columns = options.columns,
      rows = [],
      node,
      stack = [],
      root,
      matches = matcher(options.selector || 'table'),
      done = false,
      parser = new htmlparser.Parser({
        onopentag: onopentag,
        ontext: ontext,
        onclosetag: onclosetag
      });

  function onopentag(name, attrs) {
    // console.warn('<' + name + '>');
    if (node) stack.push(node);
    var parent = node;
    node = createNode(name, attrs);
    node.closed = false;
    if (parent) {
      parent.appendChild(node);
    }
    if (!root) {
      var match = matches(node);
      if (match) {
        root = node;
      }
    }
  }

  function createNode(name, attrs) {
    var node = document.createElement(name);
    if (attrs) {
      for (var attr in attrs) {
        node.setAttribute(attr, attrs[attr]);
      }
    }
    return node;
  }

  function ontext(text) {
    if (!node) return;
    node.appendChild(document.createTextNode(text));
  }

  function onclosetag(name) {
    // console.warn('</' + name + '>');
    node.closed = true;
    if (root) {
      processNode(node);
      if (node === root) {
        root = null;
        done = true;
        // console.warn('<--- inactive', node.nodeName, node.attributes);
      }
    }
    node = stack.pop();
  }

  function processNode(node) {
    switch (node.nodeName.toLowerCase()) {
      case 'br':
        node.appendChild(document.createTextNode('\n'));
        return;
      case 'thead':
        if (!columns) {
          var rows = node.querySelectorAll('tr');
          // console.warn('processing %d row(s) in <thead>...', rows.length);
          columns = readColumns(rows);
        }
        return;
      case 'tr':
        return processRow(node);
      case 'th':
      case 'td':
        return processCell(node);
    }
  }

  function processRow(tr) {
    if (!columns) {
      if (tr.scoped || tr.parentNode.nodeName !== 'THEAD') {
        columns = readColumns([tr]);
        // console.warn('columns:', columns);
      }
    } else {
      var row = readColumnsFromRow(tr, columns);
      // console.warn('read row:', row);
      rows.push(row);
    }
  }

  function processCell(el) {
    if (el.getAttribute('scope') === 'col' && !el.parentNode.scoped) {
      // console.warn('scoped row:', el.parentNode);
      el.parentNode.scoped = true;
    }
  }

  return through2.obj(function(chunk, enc, next) {
    parser.write(chunk);
    while (rows.length) {
      this.push(rows.shift());
    }
    next();
    if (done) this.end();
  });
}

function readColumns(trs) {
  var rows = [];
  trs.forEach(function(tr, i) {
    var row = rows[i] || (rows[i] = []),
        x = i,
        y = 0;
    tr.querySelectorAll('td, th').forEach(function(cell, j) {
      if (cell.nodeType !== 1) return;

      // console.warn('read header:', cell.name, cell.textContent);
      var rowspan = +cell.getAttribute('rowspan') || 1,
          colspan = +cell.getAttribute('colspan') || 1,
          rowRange = range(x, x + rowspan);

      while (y < row.length) {
        var c = row[y];
        if (c) y++;
        else break;
      }

      var colRange = range(y, y + colspan),
          d = {
            x: x,
            y: y,
            text: clean(cell.textContent),
            rowspan: rowspan,
            colspan: colspan
          };
      rowRange.forEach(function(x) {
        var row = rows[x] || (rows[x] = []);
        colRange.forEach(function(y, z) {
          row[y] = z > 0
            ? extend({}, d)
            : d;
        });
      });
      y += colspan;
    });
  });

  var cols = rows[0];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    for (var j = 0; j < row.length; j++) {
      if (!row[j]) continue;
      else if (row[j] === cols[j]) continue;
      else if (!cols[j]) cols[j] = row[j];
      // console.warn('combining:', cols[j], 'with', row[j]);
      cols[j].text += ' ' + row[j].text;
    }
  }
  // console.warn('columns:', JSON.stringify(cols, null, '  '));
  return cols.map(function(d) { return d.text; });
}

function readColumnsFromRow(tr, columns) {
  var data = {};
  // TODO: account for colspan and rowspan
  tr.querySelectorAll('td, th').forEach(function(cell, i) {
    if (cell.nodeType !== 1) return;
    var key = columns[i];
    if (data.hasOwnProperty(key)) {
      data[key] = [data[key], cell.text];
    } else {
      data[key] = cell.textContent;
    }
  });
  return data;
}

function clean(text) {
  return trim(text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' '));
}

function range(a, b, step) {
  var range = [];
  if (arguments.length < 3) step = 1;
  for (a; a < b; a += step) range.push(a);
  return range;
}
