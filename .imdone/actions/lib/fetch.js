const https = require('https')

module.exports = async function (url, opts) {
  const { method, headers, body } = opts
  url = new URL(url)
  const port = url.protocol === 'https:' ? 443 : 80
  const options = {
    hostname: url.hostname,
    port: port,
    path: url.pathname,
    method,
    headers: {
      'User-Agent': 'imdone publish extension',
      'Content-length': body.length,
      ...headers,
    },
  }

  console.log(body)
  console.log(options)

  return new Promise((resolve, reject) => {
    let result = []

    const req = https.request(options, (res) => {
      res.on('data', (chunk) => result.push(chunk))
      res.on('end', () => {
        const data = Buffer.concat(result).toString()
        console.log('end', data)
        resolve(JSON.parse(data).data)
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}
