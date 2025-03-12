import {
	renderMarkdown,
} from '../adapters/markdown'

export default {
  
  getAvailablePlugins: async function () {
    const response = await fetch('https://raw.githubusercontent.com/imdone/imdone-plugins/main/index.json')
    const plugins = response.body
    for (const plugin of plugins) {
      plugin.content = renderMarkdown(await getReadmeContent(plugin))
    }
    return plugins
  },

}

async function getReadmeContent({version}) {
  const response = await fetch(`https://api.github.com/repos/${version}/readme`)
  const { content } = response.body
  const buffer = Buffer.from(content, 'base64');
  return buffer.toString('utf-8');
}

const https = require('https')

async function fetch(url, opts = { method: 'GET', headers: {} }) {
  const { method, headers, body, debug = () => { } } = opts
  if (body) headers['Content-Length'] = body.length
  headers['Cache-Control'] = 'no-cache'; // Add Cache-Control header
  url = new URL(url)
  const port = url.protocol === 'https:' ? 443 : 80
  const options = {
      hostname: url.hostname,
      port: port,
      path: url.pathname,
      method,
      headers: {
          'User-Agent': 'imdone',
          ...headers,
      },
  }

  debug("Fetch request:", JSON.stringify({ method, url, body }))
  
  return new Promise((resolve, reject) => {
      let result = []

      const req = https.request(options, (res) => {
          res.on('data', (chunk) => result.push(chunk))
          res.on('end', () => {
              const data = Buffer.concat(result).toString()
              debug("Fetch response:", JSON.stringify({ data, status: res.statusCode }))
              resolve({ body: data && JSON.parse(data), status: res.statusCode })
          })
      })
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
  })
}
