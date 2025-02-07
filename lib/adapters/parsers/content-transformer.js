const template = require('lodash.template')

module.exports = {
  format,
}

function removeDisplayComments(description) {
  return description.replace(/<!--\s*\[([\s\S]*?)\]\s*-->/g, '$1')
}

function format(content, data, mustache) {
  const opts = { interpolate: /(?<![`\\])\${([\s\S]+?)}/g }

  if (mustache) content = removeDisplayComments(content)

  try {
    content = template(content, opts)(data)
  } catch (e) {
    console.error(e)
    // content = content.replace(opts.interpolate, `~~\${${e}}~~`)
  }

  if (mustache) {
    const opts = { interpolate: /(?<!`){{([\s\S]+?)}}/g }
    try {
      content = template(content, opts)(data)
    } catch (e) {
      console.error(e)
      content = content.replace(opts.interpolate, `~~{{${e}}}~~`)
    }
  }

  return content
}
