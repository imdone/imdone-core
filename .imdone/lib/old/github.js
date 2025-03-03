import { Octokit } from '@octokit/core'

async function openPR(project, version, body) {
  const octokit = new Octokit({ auth: 'your-token!' }),
    owner = 'imdone',
    repo = 'imdone-core',
    title = `Release`,
    body = 'This pull request is a test!',
    head = 'my-feature-branch',
    base = 'master'

  const response = await octokit.request(`POST /repos/{owner}/{repo}/pulls`, {
    owner,
    repo,
    title,
    body,
    head,
    base,
  })
}
