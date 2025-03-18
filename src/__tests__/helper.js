import { cp, mkdtemp } from 'fs/promises'
import path from 'path'
import path from 'path';
import os from 'os';

export async function getFreshRepoTestData (repoName = "repo2") {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), `imdone-core-test-${repoName}-`));
  const repoSrc  = path.join(process.cwd(), "test", "repos", repoName)

  await cp(repoSrc, tmpDir, { recursive: true, force: true })

  console.log('Test repo created in:', tmpDir)
  return tmpDir
}

