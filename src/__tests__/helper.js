import { rm, cp, mkdir } from 'fs/promises'
import path from 'path'

const tmpDir = path.join(process.cwd(), 'tmp')
const tmpReposDir = path.join(tmpDir, "repos")
const repoSrc  = path.join(process.cwd(), "test", "repos")

export async function getFreshRepo (repoName = "repo2") {
  const repoDir = path.join(tmpReposDir, repoName)
  await rm(tmpDir, { recursive: true, force: true })
  await mkdir(tmpDir, { recursive: true })
  await cp(repoSrc, tmpReposDir, { recursive: true, force: true })
  return repoDir
}

