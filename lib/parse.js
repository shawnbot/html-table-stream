var htmlparser = require('htmlparser2'),
    dom = require('dom-lite'),
    document = dom.document,
    matcher = require('./matcher'),
    trim = require('trim'),
    extend = require('extend'),
    through2 = require('through2');

var presets = {
  'google-html': {
    headerRow: matcher('tbody tr'),
    headerCell: matcher('td'),
    bodyRow: function(tr, i) {
      // ugggghhhh, why do you make me do this, google?
      return !tr.firstChild.className.match(/freezebar/);
    },
    bodyCell: matcher('td')
  }
};

module.exports = function parse(options) {
  var log = options.verbose ? console.warn.bind(console) : noop;

  if (typeof options === 'string') {
    // if options is a string, assume it's a preset name
    options = presets[options] || {};
  } else if (options.preset) {
    // otherwise, merge in options from the named preset
    var preset = presets[options.preset];
    if (preset) {
      Object.keys(preset).forEach(function(key) {
        if (!options.hasOwnProperty(key)) {
          options[key] = preset[key];
        }
      });
    } else {
      log('no such preset: "%s"', options.preset);
    }
  }

  var columns = options.columns,
      rows = [],
      stack = [],
      node,
      table,
      done = false,
      matchesTable = matcher(options.table || 'table'),
      matchesHeaderRow = matcher(options.headerRow || 'tr'),
      matchesHeaderCell = matcher(options.headerCell || 'th, td'),
      matchesContentRow = matcher(options.bodyRow || 'tr'),
      matchesContentCell = matcher(options.bodyCell || 'th, td'),
      parser = new htmlparser.Parser({
        onopentag: onopentag,
        ontext: ontext,
        onclosetag: onclosetag
      });

  function onopentag(name, attrs) {
    // log('<' + name + '>');
    if (node) stack.push(node);
    var parent = node;
    node = createNode(name, attrs);
    node.closed = false;
    if (parent) {
      parent.appendChild(node);
    }
    if (!table) {
      var match = matchesTable(node);
      if (match) {
        table = node;
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
    // log('</' + name + '>');
    node.closed = true;
    if (table) {
      processNode(node);
      if (node === table) {
        table = null;
        done = true;
        // log('<--- inactive', node.nodeName, node.attributes);
      }
    }
    node = stack.pop();
  }

  function processNode(node) {
    switch (node.nodeName.toLowerCase()) {
      case 'br':
        // append a line break to the node's text content, which will be
        // collapsed into a space in clean()
        node.appendChild(document.createTextNode('\n'));
        return;

      // if we've read a <thead>, this is probably where we want to get the header rows
      case 'thead':
        if (!columns) {
          var rows = node.querySelectorAll('tr').filter(matchesHeaderRow);
          if (rows.length) {
            log('processing %d row(s) in <thead>...', rows.length);
            columns = readColumns(rows, matchesHeaderCell, log);
            log('columns:', columns);
          } else {
            log('no matching rows in <thead>');
          }
        }
        return;

      case 'tr':
        processRow(node);
        return;

      case 'th':
      case 'td':
        // XXX filter here?
        return processCell(node);
    }
  }

  function processRow(tr) {
    if (!columns) {
      // if we haven't read any columns yet, assume that we'll get them from
      // the first row
      if (matchesHeaderRow(tr, getNodeIndex(tr))) {
        log('reading columns from:', tr.outerHTML);
        columns = readColumns([tr], matchesHeaderCell, log);
        log('columns:', columns);
        // log('columns:', columns);
      }
    } else if (matchesContentRow(tr, getNodeIndex(tr))) {
      var row = readColumnsFromRow(tr, columns, matchesContentCell, log);
      log('read row:', row);
      rows.push(row);
    } else {
      log('skipping row:', columns, tr.outerHTML);
    }
  }

  function processCell(el) {
    // XXX anything here?
  }

  return through2.obj(function(chunk, enc, next) {
    parser.write(chunk);
    while (rows.length) {
      this.push(rows.shift());
    }
    next();
    if (done) this.end();
  });
};

// export presets
module.exports.presets = presets;

function readColumns(trs, cellFilter, log) {
  var rows = [];
  trs.forEach(function(tr, i) {
    var row = rows[i] || (rows[i] = []),
        x = i,
        y = 0;
    tr.querySelectorAll('th, td').filter(cellFilter || yes).forEach(function(cell, j) {
      // log('read header:', cell.name, cell.textContent);
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
      // log('combining:', cols[j], 'with', row[j]);
      cols[j].text += ' ' + row[j].text;
    }
  }
  // log('columns:', JSON.stringify(cols, null, '  '));
  return cols.map(function(d) { return d.text; });
}

function readColumnsFromRow(tr, columns, cellFilter, log) {
  var data = {};
  // TODO: account for colspan and rowspan
  tr.querySelectorAll('th, td').filter(cellFilter || yes).forEach(function(cell, i) {
    var key = columns[i];
    var text = clean(cell.textContent);
    if (data.hasOwnProperty(key)) {
      data[key] = [data[key], text];
    } else {
      data[key] = clean(cell.textContent);
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

function getNodeIndex(node) {
  var i = 0;
  while (node = node.previousSibling) {
    if (node.nodeType === 1) i++;
  }
  return i;
}

function yes() {
  return true;
}

function no() {
  return false;
}

function noop() {
}
