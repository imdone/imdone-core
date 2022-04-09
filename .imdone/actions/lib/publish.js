const https = require('https')
const _path = require('path')
const fs = require('fs').promises
const formstream = require('formstream')
require('dotenv').config({ path: _path.join(__dirname, '..', '.env') })

const token = process.env.MEDIUM_API_TOKEN
const publication = 'imdone.io'

async function publishToMedium(project, task) {
  try {
    const userId = await getUserId()
    const publicationId = await getPublication(userId, publication)
    const content = await uploadImages(task, await getSourceContent(task))
    if (content.trim().length < 1)
      return project.toast({ message: 'Nothing to publish' })
    const { url } = await postToMedium(content, task.tags, publicationId)
    return project.openUrl(url)
  } catch (e) {
    console.error(`Error uploading article to medium: ${task.source.path}`, e)
    throw e
  }
}

async function replaceAsync(str, regex, asyncFn) {
  const promises = []
  str.replaceAll(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args)
    promises.push(promise)
  })
  const data = await Promise.all(promises)
  return str.replaceAll(regex, () => data.shift())
}

async function uploadImages(task, content) {
  return replaceAsync(
    content,
    /!\[(.*?)\]\((.*?)\)/g,
    async (match, alt, imagePath) => {
      const { url } = await uploadImage(task, imagePath)
      return `![${alt}](${url})`
    }
  )
}

function uploadImage(task, imagePath) {
  const filePath = _path.join(
    task.data.projectPath,
    _path.dirname(task.source.path),
    imagePath
  )
  const form = formstream().file('image', filePath)

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Accept-Charset': 'utf-8',
    'Content-Type': 'application/json',
    'User-Agent': 'imdone publish extension',
    ...form.headers(),
  }
  var options = {
    method: 'POST',
    host: 'api.medium.com',
    path: '/v1/images',
    headers,
  }

  console.log('options:', options)

  return new Promise((resolve, reject) => {
    let body = []

    const req = https.request(options, (res) => {
      console.log('Status: %s %s', res.statusCode, res.statusMessage)
      res.on('data', (chunk) => body.push(chunk))
      res.on('end', () => {
        const data = Buffer.concat(body).toString()
        resolve(JSON.parse(data).data)
      })
    })
    req.on('error', reject)
    form.pipe(req)
  })
}

async function postToMedium(content, tags, publicationId) {
  // publish draft
  const postRequest = {
    title: content.split('\n')[0],
    contentFormat: 'markdown',
    content,
    tags: tags,
    publishStatus: 'draft',
  }
  return mediumRequest(
    `publications/${publicationId}/posts`,
    'POST',
    JSON.stringify(postRequest)
  )
}

async function getUserId() {
  const { id } = await mediumRequest('me', 'GET')
  return id
}

async function getSourceContent(task) {
  const lines = (await fs.readFile(_path.join(task.repoId, task.source.path)))
    .toString()
    .split('\n')
  return lines.slice(0, task.line - 1).join('\n')
}

async function getPublication(userId, name) {
  return (await mediumRequest(`users/${userId}/publications`, 'GET')).filter(
    (pub) => pub.name === name
  )[0].id
}

async function mediumRequest(path, method, postData) {
  const options = {
    hostname: 'api.medium.com',
    port: 443,
    path: `/v1/${path}`,
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
      'Content-Type': 'application/json',
      'User-Agent': 'imdone publish extension',
    },
  }

  if (postData) options.headers['Content-length'] = postData.length
  return new Promise((resolve, reject) => {
    let body = []

    const req = https.request(options, (res) => {
      res.on('data', (chunk) => body.push(chunk))
      res.on('end', () => {
        const data = Buffer.concat(body).toString()
        resolve(JSON.parse(data).data)
      })
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

module.exports = { publishToMedium }
