const sanitizeHtml = require('sanitize-html');

function clean(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}

module.exports = {
  clean
};
