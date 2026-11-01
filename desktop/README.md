# Radii Office desktop apps

Every Radii Office app as a desktop app (Tauri 2), for macOS (Apple Silicon and Intel), Windows and Linux.

- `apps.json`: the apps, their names, and the icon each one uses (its favicon design).
- `icon-src/`: Imbuer, Mainkey, Inkpath and Phosphor's icons rebuilt at full size (`node scripts/make-icons.mjs`).
- `scripts/build-all.mjs`: stages each app (its folder + the shared files it uses), makes its icons and config, and builds it.
- `src-tauri/`: the one shared native shell (a window that opens the app; downloads go to the Downloads folder).
- `workflow/desktop.yml`: the GitHub Actions workflow (copied to `.github/workflows/`) that builds all four platforms and publishes them to the `desktop` release.

Build on this computer (macOS example):

```sh
npm install
node scripts/build-all.mjs --target aarch64-apple-darwin --label macOS-AppleSilicon
node scripts/build-all.mjs --target x86_64-apple-darwin --label macOS-Intel --apps writeout,bitbook
```

Windows and Linux builds need those systems, which is what the workflow is for.
