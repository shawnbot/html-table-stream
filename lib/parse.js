var htmlparser = require('htmlparser2'),
    trim = require('trim'),
    extend = require('extend'),
    through2 = require('through2');

module.exports = function parse(options) {
  var columns = options.columns,
      rows = [],
      node,
      stack = [],
      done = false,
      parser = new htmlparser.Parser({
        onopentag: onopentag,
        ontext: ontext,
        onclosetag: onclosetag
      });

  function onopentag(name, attrs) {
    switch (name) {
      case 'br':
        if (node) node.text += '\n';
    }
    if (node) stack.push(node);
    node = {
      name: name,
      text: '',
      attrs: attrs,
      children: [],
      closed: false,
      parent: node
    };
    if (node.parent) {
      node.parent.children.push(node);
    }
  }

  function ontext(text) {
    if (!node) return;
    node.text += text;
  }

  function onclosetag(name) {
    node.closed = true;
    node.text = clean(node.text);
    process(node);
    node = stack.pop();
  }

  function process(node) {
    switch (node.name) {
      case 'thead':
        if (!columns) {
          // console.warn('processing %d row(s) in <thead>...', node.children.length);
          columns = readColumns(node.children);
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
      if (tr.parent.name !== 'thead') {
        // console.warn('reading columns from first <tr>...');
        columns = readColumns([tr]);
      }
    } else {
      var row = readColumnsFromRow(tr, columns);
      // console.warn('read row:', row);
      rows.push(row);
    }
  }

  function processCell(el) {
    // console.warn('  process cell:', el);
  }

  return through2.obj(function(chunk, enc, next) {
    parser.write(chunk);
    while (rows.length) {
      this.push(rows.shift());
    }
    next();
  });
}

function readColumns(trs) {
  var rows = [];
  trs.forEach(function(tr, i) {
    var row = rows[i] || (rows[i] = []),
        x = i,
        y = 0;
    tr.children.forEach(function(cell, j) {
      // console.warn('read header:', cell.name, cell.text);
      var rowspan = +cell.attrs.rowspan || 1,
          colspan = +cell.attrs.colspan || 1,
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
            text: cell.text,
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
  tr.children.forEach(function(cell, i) {
    var key = columns[i];
    if (data.hasOwnProperty(key)) {
      data[key] = [data[key], cell.text];
    } else {
      data[key] = cell.text;
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
