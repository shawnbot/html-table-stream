var cssauron = require('cssauron');

/*
 * A standalone, read-only DOM Node interface.
 * Somethign like this probably exists somewhere.
 */
var Node = function(name, attrs) {
  this.nodeName = name;
  this.attributes = attrs || {};
  this.childNodes = [];
  this._textContent = '';
};

/*
 * Node.matcher('table')(node) === true if node.nodeName === 'table'
 */
Node.matcher = cssauron({
  tag:      'nodeName',
  contents: 'textContent',
  id:       'id',
  'class':  'className',
  parent:   'parentNode',
  children: 'childeNodes',
  attr:     'getAttribute(attr)'
});

Node.prototype.getAttribute = function(attr) {
  return this.attributes[attr];
};

Object.defineProperty(Node.prototype, 'id', {
  get: function() {
    return this.getAttribute('id');
  }
});

Object.defineProperty(Node.prototype, 'className', {
  get: function() {
    return this.getAttribute('class');
  }
});

Object.defineProperty(Node.prototype, 'textContent', {
  get: function() {
    if (!this.childNodes.length) return this._textContent;
    var content = [this._textContent];
    this.childNodes.forEach(function(child) {
      content.push(child.textContent);
    });
    return content.join('');
  },
  set: function(text) {
    this._textContent = text || '';
  }
});

Node.prototype.appendChild = function(node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
  node.parentNode = this;
  this.childNodes.push(node);
  return node;
};

Node.prototype.removeChild = function(node) {
  var i = this.childNodes.indexOf(node);
  if (i > -1) this.childNodes.splice(i, 1);
  return node;
};

module.exports = Node;
