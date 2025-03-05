const https = require('https')
const version = require('../lib/version')

module.exports = async function () {
  const project = this.project
  const packageInfo = await fetch('https://registry.npmjs.org/imdone-core/latest')
  const branch = (await project.exec(`cd ${project.path} && git branch --show-current`)).trim()
  const publishedVersion = packageInfo.body.version
  return {
    version: version(),
    publishedVersion,
    branch
  }
}

async function fetch(url, opts = { method: 'GET', headers: {} }) {
  const { method, headers, body, debug = () => { } } = opts
  if (body) headers['Content-Length'] = body.length
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
