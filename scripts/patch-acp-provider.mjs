// The ACP provider spawns its agent without windowsHide. Because Instructor is a
// GUI process, that makes Windows create a visible console for codex-acp.exe
// while a chat response is being generated.
//
// Keep this patch in postinstall until @mcpc-tech/acp-ai-provider exposes spawn
// options or enables windowsHide itself.
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDirectory, "..")
const providerRoot = join(
  projectRoot,
  "node_modules",
  "@mcpc-tech",
  "acp-ai-provider",
)

const bundles = ["index.mjs", "index.cjs"]

for (const bundle of bundles) {
  const bundlePath = join(providerRoot, bundle)
  const source = readFileSync(bundlePath, "utf8")

  if (source.includes("cwd: sessionCwd,\n        windowsHide: true")) {
    console.log(`[patch-acp-provider] ${bundle} is already patched`)
    continue
  }

  const patched = source.replace(
    "        cwd: sessionCwd\n      });",
    "        cwd: sessionCwd,\n        windowsHide: true\n      });",
  )

  if (patched === source) {
    throw new Error(
      `[patch-acp-provider] Could not locate the agent spawn options in ${bundle}`,
    )
  }

  writeFileSync(bundlePath, patched)
  console.log(`[patch-acp-provider] Hid the ACP agent console in ${bundle}`)
}
