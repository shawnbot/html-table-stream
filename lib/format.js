var htmlspecialchars = require('htmlspecialchars'),
    through2 = require('through2');

module.exports = function format(options) {
  if (!options) options = {};
  var header = false,
      stack = [],
      indent = options.indent || '',
      newline = indent ? '\n' : '',
      value = formatter(options.value),
      columns = options.columns;

  return through2.obj(function(row, enc, next) {
    var buffer = [];
    if (!header) {
      // console.warn('writing header');
      this.push(openTag('table', options.table));
      this.push(openTag('thead', options.thead));
      this.push(openTag('tr'));
      if (!columns) {
        columns = Object.keys(row);
        // console.warn('detected columns:', columns);
      }
      columns.forEach(function(col) {
        this.push(openTag('th', {scope: 'col'}));
        this.push(String(col));
        this.push(closeTag('th'));
      }, this);
      this.push(closeTag('tr'));
      this.push(closeTag('thead'));
      this.push(openTag('tbody', options.tbody));
      header = true;
    }
    this.push(openTag('tr'));
    columns.forEach(function(col) {
      this.push(openTag('td'));
      this.push(value.call(row, row[col], col));
      this.push(closeTag('td'));
    }, this);
    this.push(closeTag('tr'));
    return next();
  }, function flush(done) {
    this.push(closeTag('tbody'));
    this.push(closeTag('table'));
    done();
  });

  function openTag(name, attrs) {
    var ws = repeat(indent, stack.length);
    var tag = [ws ? newline : '', ws, '<', name];
    if (attrs) {
      for (var key in attrs) {
        var value = htmlspecialchars(attrs[key]);
        tag.push(' ', key, '="', value, '"');
      }
    }
    tag.push('>');
    stack.push(name);
    return tag.join('');
  }

  function closeTag(name) {
    var current = stack.pop();
    if (current !== name) {
      console.warn('bad end tag: %s (expected %s)', name, current);
    }
    var close = '</' + name + '>';
    switch (name) {
      case 'td':
      case 'th':
        return close + newline;
    }
    var ws = repeat(indent, stack.length);
    return ws + close + newline;
  }
}

function repeat(str, times) {
  if (times <= 0) return '';
  var out = [];
  for (var i = 0; i < times; i++) out.push(str);
  return out.join('');
}

function defaultFormat(value) {
  return (value == null)
    ? ''
    : String(value);
}

function formatter(format) {
  if (typeof format === 'string') {
    return function(value) {
      return (value == null)
        ? ''
        : format.replace(/{}/g, value);
    };
  } else if (typeof format === 'function') {
    return format;
  }
  return defaultFormat;
}
