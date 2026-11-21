// Marks heavy, regenerable folders so iCloud Drive does not sync them.
// The project lives in iCloud Drive on the owner's Mac; elsewhere (Linux, Vercel) this is a no-op.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

if (process.platform === "darwin") {
  for (const dir of ["node_modules", ".next"]) {
    try {
      mkdirSync(dir, { recursive: true });
      execFileSync("xattr", ["-w", "com.apple.fileprovider.ignore#P", "1", dir]);
    } catch (err) {
      console.warn(`icloud-ignore: could not mark ${dir}:`, err.message);
    }
  }
}
