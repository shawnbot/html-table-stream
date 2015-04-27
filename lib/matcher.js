var cssauron = require('cssauron');

var matchSelector = cssauron({
  tag:      'nodeName.toLowerCase()',
  contents: 'textContent',
  id:       'id',
  'class':  'className',
  parent:   'parentNode',
  children: 'childeNodes',
  attr:     'getAttribute(attr)'
});

module.exports = function(selector) {
  if (typeof selector === 'function') {
    return selector;
  }
  return matchSelector(selector);
};
