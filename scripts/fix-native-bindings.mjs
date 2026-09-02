/**
 * Repairs the native `.node` binaries that OneDrive strips out of node_modules.
 *
 *     npm run fix:native
 *
 * Why this exists: this project lives inside a OneDrive-synced folder. As npm
 * extracts a package, OneDrive's sync filter removes the large `.node` binaries
 * before they are written to disk. npm reports success, the package folder
 * contains only its package.json and README, and the app then fails at runtime
 * with "Cannot find native binding" or falls back to slow WASM.
 *
 * Verified: the same tarball extracted to C:\temp keeps its 9.4 MB `.node`;
 * extracted inside OneDrive, the file is gone.
 *
 * This script downloads each affected package with `npm pack` into a folder
 * OUTSIDE OneDrive, unpacks it there, and copies the binary into place. Copying
 * an already-extracted binary in is not intercepted — only npm's extraction is.
 *
 * The durable fix is to move the project to a non-synced path, e.g. C:\dev.
 */
import { execFileSync } from "node:child_process";
import {
  mkdtempSync, existsSync, readdirSync, copyFileSync, mkdirSync, statSync, readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NM = join(ROOT, "node_modules");

/** Packages whose binary is stripped, and where each one must end up. */
function targets() {
  const nextVer = readVersion("next");
  const oxideVer = readVersion("@tailwindcss/oxide");
  const lcssVer = readVersion("lightningcss");
  return [
    {
      pkg: `@next/swc-win32-x64-msvc@${nextVer}`,
      file: "next-swc.win32-x64-msvc.node",
      dests: [join(NM, "@next", "swc-win32-x64-msvc")],
    },
    {
      pkg: `lightningcss-win32-x64-msvc@${lcssVer}`,
      file: "lightningcss.win32-x64-msvc.node",
      dests: [join(NM, "lightningcss"), join(NM, "lightningcss-win32-x64-msvc")],
    },
    {
      pkg: `@tailwindcss/oxide-win32-x64-msvc@${oxideVer}`,
      file: "tailwindcss-oxide.win32-x64-msvc.node",
      dests: [join(NM, "@tailwindcss", "oxide"), join(NM, "@tailwindcss", "oxide-win32-x64-msvc")],
    },
  ];
}

function readVersion(name) {
  // Read the manifest off disk: many packages restrict "exports" so
  // require("pkg/package.json") throws ERR_PACKAGE_PATH_NOT_EXPORTED.
  const p = join(NM, ...name.split("/"), "package.json");
  if (!existsSync(p)) throw new Error(`${name} is not installed — run npm install first.`);
  return JSON.parse(readFileSync(p, "utf8")).version;
}

function alreadyGood(t) {
  return t.dests.every((d) => {
    const p = join(d, t.file);
    return existsSync(p) && statSync(p).size > 1_000_000;
  });
}

function main() {
  if (process.platform !== "win32" || process.arch !== "x64") {
    console.log(`Nothing to do on ${process.platform}/${process.arch} — this repairs win32-x64 only.`);
    return;
  }

  const work = mkdtempSync(join(tmpdir(), "afry-native-"));
  let fixed = 0;
  let ok = 0;

  for (const t of targets()) {
    if (alreadyGood(t)) {
      console.log(`ok      ${t.pkg.split("@").slice(0, -1).join("@")}`);
      ok++;
      continue;
    }
    console.log(`fetch   ${t.pkg}`);
    execFileSync("npm", ["pack", t.pkg, "--silent"], { cwd: work, stdio: "inherit", shell: true });

    const tgz = readdirSync(work).find((f) => f.endsWith(".tgz"));
    if (!tgz) throw new Error(`npm pack produced no tarball for ${t.pkg}`);

    const out = join(work, "x");
    mkdirSync(out, { recursive: true });
    execFileSync("tar", ["-xzf", join(work, tgz), "-C", out], { stdio: "inherit", shell: true });

    const src = join(out, "package", t.file);
    if (!existsSync(src)) throw new Error(`${t.file} not found inside ${tgz}`);

    for (const d of t.dests) {
      mkdirSync(d, { recursive: true });
      copyFileSync(src, join(d, t.file));
      console.log(`  ->    ${join(d, t.file).replace(ROOT, ".")}`);
    }
    fixed++;
    execFileSync("cmd", ["/c", "del", "/q", join(work, tgz)], { stdio: "ignore" });
    execFileSync("cmd", ["/c", "rmdir", "/s", "/q", out], { stdio: "ignore" });
  }

  console.log(
    fixed
      ? `\nRepaired ${fixed} package(s), ${ok} were already intact. Restart the dev server.`
      : `\nAll ${ok} native bindings are intact. Nothing to repair.`,
  );
}

try {
  main();
} catch (err) {
  console.error("\nRepair failed:", err.message);
  process.exit(1);
}
