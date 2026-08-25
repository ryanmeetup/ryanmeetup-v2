const { execFileSync } = require("node:child_process");

try {
  require.resolve("next-themes");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    console.log("No patched packages are installed; skipping patch-package.");
    process.exit(0);
  }

  throw error;
}

execFileSync(process.execPath, [require.resolve("patch-package/index.js")], {
  stdio: "inherit",
});
