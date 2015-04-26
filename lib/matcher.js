var cssauron = require('cssauron');

module.exports = cssauron({
  tag:      'nodeName.toLowerCase()',
  contents: 'textContent',
  id:       'id',
  'class':  'className',
  parent:   'parentNode',
  children: 'childeNodes',
  attr:     'getAttribute(attr)'
});
