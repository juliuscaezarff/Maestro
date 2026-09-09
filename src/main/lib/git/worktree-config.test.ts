import { afterEach, describe, expect, it } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  detectWorktreeConfig,
  getAvailableConfigPaths,
  saveWorktreeConfig,
} from "./worktree-config"

const testDirectories: string[] = []

async function createProject(): Promise<string> {
  const projectPath = await mkdtemp(join(tmpdir(), "instructor-worktree-config-"))
  testDirectories.push(projectPath)
  return projectPath
}

afterEach(async () => {
  await Promise.all(
    testDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe("Instructor worktree config", () => {
  it("detects .instructor/worktree.json as the Instructor config", async () => {
    const projectPath = await createProject()
    const configPath = join(projectPath, ".instructor", "worktree.json")
    await mkdir(join(projectPath, ".instructor"), { recursive: true })
    await writeFile(configPath, JSON.stringify({ "setup-worktree": ["bun install"] }))

    const detected = await detectWorktreeConfig(projectPath)

    expect(detected).toEqual({
      config: { "setup-worktree": ["bun install"] },
      path: configPath,
      source: "instructor",
    })
  })

  it("does not detect the former .maestro config path", async () => {
    const projectPath = await createProject()
    await mkdir(join(projectPath, ".maestro"), { recursive: true })
    await writeFile(
      join(projectPath, ".maestro", "worktree.json"),
      JSON.stringify({ "setup-worktree": ["bun install"] }),
    )

    expect(await detectWorktreeConfig(projectPath)).toEqual({
      config: null,
      path: null,
      source: null,
    })
  })

  it("saves to and reports the Instructor path by default", async () => {
    const projectPath = await createProject()
    const expectedPath = join(projectPath, ".instructor", "worktree.json")

    const result = await saveWorktreeConfig(projectPath, {
      "setup-worktree": ["bun install"],
    })

    expect(result).toEqual({ success: true, path: expectedPath })
    expect(JSON.parse(await readFile(expectedPath, "utf-8"))).toEqual({
      "setup-worktree": ["bun install"],
    })
    expect(await getAvailableConfigPaths(projectPath)).toEqual({
      cursor: {
        exists: false,
        path: join(projectPath, ".cursor", "worktrees.json"),
      },
      instructor: { exists: true, path: expectedPath },
    })
  })
})
