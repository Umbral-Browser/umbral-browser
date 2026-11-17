# Umbral test builds

This guide describes the local Linux test package and the manually triggered Windows test-build workflow. They produce temporary test artifacts only; they do not publish a release. The agreed distribution targets are a source-built Linux Flatpak proposal for Flathub and a Windows x86_64 portable ZIP with manual updates. Neither target currently has a public release download.

The packages are built from the checked-out Umbral sources and work independently of the source repository and `engine/` build directory. The Linux archive still relies on the host system’s supported shared libraries.

## Linux x86_64: build, package, install

The main `engine/obj-x86_64-pc-linux-gnu/dist/bin/zen` executable is dated **October 25, 2026**. A separate clean-tree build was compiled later as a source-regeneration check; it is validation evidence, not the packaging target. The timestamp of the main executable alone does not establish whether it contains a particular UI change. The commands below use the main checkout: import the current persistent sources, rebuild that object tree, then package it. They do not download a new Firefox/Zen base. On this machine, the engine tree occupies about 23 GiB, including a 17 GiB Linux object directory; the workspace volume has 546 GiB free, and `~/.mozbuild` occupies 3.1 GiB on a home volume with 109 GiB free.

From the repository root:

```sh
npm run import
SURFER_PLATFORM=linux SURFER_COMPAT=x86_64 MOZ_PURGE_CACHES=1 npm run build
SURFER_PLATFORM=linux SURFER_COMPAT=x86_64 npm run package
ls -lh dist/zen-*.tar.xz
```

`npm run import` applies the persistent sources and patches to the existing generated engine tree. `npm run build` compiles them, reusing valid build outputs. `npm run package` creates the compressed Linux archive under `dist/`; the exact archive name includes the application version and locale.

Before installing, check the archive’s browser files, Umbral icon, signed uBlock Origin XPI, and x86_64 executable:

```sh
set -euo pipefail
archive_file="$(find dist -maxdepth 1 -type f -name 'zen-*.tar.xz' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p')"
test -n "$archive_file"
entries="$(tar -tJf "$archive_file")"
printf '%s\n' "$entries" | grep -Eq '(^|/)browser/omni\.ja$'
printf '%s\n' "$entries" | grep -Eq '(^|/)browser/chrome/icons/default/default128\.png$'
xpi_path="$(printf '%s\n' "$entries" | awk '$0 ~ /(^|\/)distribution\/extensions\/uBlock0@raymondhill\.net\.xpi$/ { print; exit }')"
binary_path="$(printf '%s\n' "$entries" | awk '$0 ~ /(^|\/)zen$/ { print; exit }')"
test -n "$xpi_path"
test -n "$binary_path"
verify_dir="$(mktemp -d)"
trap 'rm -rf "$verify_dir"' EXIT
tar -xJOf "$archive_file" "$xpi_path" > "$verify_dir/umbral-ublock.xpi"
tar -xJOf "$archive_file" "$binary_path" > "$verify_dir/umbral-zen"
file "$verify_dir/umbral-zen" | grep -Eq 'ELF 64-bit LSB.*x86-64'
unzip -tq "$verify_dir/umbral-ublock.xpi"
echo '5b74415860456370644bd80f16125e865b0e6c356bb5dfcfb84069967eaa5287  '"$verify_dir/umbral-ublock.xpi" | sha256sum -c -
xpi_entries="$(unzip -Z1 "$verify_dir/umbral-ublock.xpi")"
printf '%s\n' "$xpi_entries" | grep -Fxq 'META-INF/mozilla.rsa'
printf '%s\n' "$xpi_entries" | grep -Fxq 'META-INF/mozilla.sf'
```

To install the newest archive into `~/.local/opt/umbral`, back up any earlier app directory, install the application icon, and create a desktop launcher with a dedicated Umbral profile:

```sh
set -euo pipefail

archive_file="$(find dist -maxdepth 1 -type f -name 'zen-*.tar.xz' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p')"
test -n "$archive_file"
stage_dir="$(mktemp -d)"
trap 'rm -rf "$stage_dir"' EXIT
tar -xJf "$archive_file" -C "$stage_dir"
app_binary="$(find "$stage_dir" -type f -name zen -perm -u+x -print -quit)"
test -n "$app_binary"
package_root="$(dirname "$app_binary")"

install_dir="$HOME/.local/opt/umbral"
if [ -e "$install_dir" ]; then
  backup_dir="${install_dir}.backup.$(date +%Y%m%d-%H%M%S)"
  mv "$install_dir" "$backup_dir"
  printf 'Previous app files backed up to %s\n' "$backup_dir"
fi
mkdir -p "$install_dir"
cp -a "$package_root"/. "$install_dir"/

profile_dir="$HOME/.local/share/umbral-test-profile"
mkdir -p "$profile_dir"
install -Dm644 \
  "$install_dir/browser/chrome/icons/default/default128.png" \
  "$HOME/.local/share/icons/hicolor/128x128/apps/umbral.png"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/umbral.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Umbral Browser
Comment=Browse with Umbral
Exec="$install_dir/zen" -profile "$profile_dir" %u
Icon=umbral
Terminal=false
Categories=Network;WebBrowser;
MimeType=text/html;x-scheme-handler/http;x-scheme-handler/https;
EOF
```

Open **Umbral Browser** from the desktop application menu. It launches with `~/.local/share/umbral-test-profile`, separate from Firefox and Zen profiles. To run it from a terminal instead:

```sh
"$HOME/.local/opt/umbral/zen" \
  -profile "$HOME/.local/share/umbral-test-profile"
```

The executable is named `zen` by the inherited build configuration; its product name and packaged application icon are Umbral.

## Linux x86_64: direct Flatpak test bundle

The Flatpak uses the separate application ID `io.github.martin08abm.umbralbrowser`. Flatpak keeps its writable app data below `~/.var/app/io.github.martin08abm.umbralbrowser`; the launcher also selects a profile under that app’s private data directory. It does not read or reuse Zen or Firefox profiles. This local test channel wraps the already-built Linux archive, including Umbral’s homepage, SearXNG setup, ETP settings and statistics, and the original signed uBlock Origin XPI. The archive and bundle can be generated from the same build, so `.tar.xz` remains available as the host-integrated alternative. This is a direct binary-packaging workflow, not a Flathub submission manifest.

Install Flatpak and `flatpak-builder` from your Linux distribution. Configure the Flathub remote and install the SDK, runtime, and Firefox BaseApp used by Zen’s manifest:

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.freedesktop.Sdk//25.08 org.freedesktop.Platform//25.08 org.mozilla.firefox.BaseApp//25.08
```

Then build the current sources from the repository root:

```sh
npm run import
SURFER_PLATFORM=linux SURFER_COMPAT=x86_64 MOZ_PURGE_CACHES=1 npm run build
SURFER_PLATFORM=linux SURFER_COMPAT=x86_64 npm run package
archive_file="$(find dist -maxdepth 1 -type f -name 'zen-*.tar.xz' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p')"
test -n "$archive_file"
bash scripts/build-flatpak.sh "$archive_file"
```

The helper checks the archive contains the browser package and uBlock XPI and that its `zen` executable is a 64-bit x86_64 ELF. It then creates a local Flatpak repository and `dist/umbral-linux-x86_64.flatpak`. It does not publish the bundle. Building requires the Freedesktop 25.08 SDK/runtime and Mozilla Firefox BaseApp 25.08. The output is a single-file application bundle, not a self-contained runtime bundle; installing it needs access to the runtime and BaseApp. The bundle records Flathub as the runtime source, but Umbral itself is not submitted to Flathub.

On another computer, install the required runtime and BaseApp, then the local bundle:

```sh
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.freedesktop.Platform//25.08 org.mozilla.firefox.BaseApp//25.08
flatpak install --user dist/umbral-linux-x86_64.flatpak
```

Launch Umbral from the desktop menu or with `flatpak run io.github.martin08abm.umbralbrowser`. Uninstall the application while preserving its profile and settings with:

```sh
flatpak uninstall --user io.github.martin08abm.umbralbrowser
```

To also erase only Umbral’s private Flatpak data, including its profile, add `--delete-data` to that uninstall command.

The manifest grants network access, audio, Wayland and fallback X11 sockets, all device nodes under `/dev`, and write access to `xdg-download`. The device grant is needed for Firefox’s Linux WebAuthn implementation: its [`authenticator-rs` backend](https://github.com/mozilla/authenticator-rs) discovers FIDO authenticators through udev and opens `/dev/hidraw*` nodes ([Mozilla’s Linux dependency note](https://bugzilla.mozilla.org/show_bug.cgi?id=1434277)). Flatpak’s [`--device=usb`](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) exposes only `/dev/bus/usb`, not `/dev/hidraw`; the Flatpak device permission that covers hidraw is `--device=all`. This grants access to every device node under `/dev` (except `/dev/shm`), so it is broader than access to USB bus nodes alone. The user’s udev permissions still apply. A successful build verifies the declared package permission; authentication with a physical security key remains a separate runtime check.

The manifest does not grant broad home-directory access. Like [Zen’s manifest](https://github.com/zen-browser/desktop/blob/dev/build/flatpak/app.zen_browser.zen.yml.template), it includes `--allow=devel`; [Flatpak documents](https://docs.flatpak.org/en/latest/flatpak-command-reference.html) that this allows additional syscalls such as `ptrace()` and `perf_event_open()`. That is a security tradeoff, and this build has not shown that the permission is necessary. The Firefox content-process sandbox and whether Umbral can run without this permission still need runtime verification. [Flatpak portals](https://docs.flatpak.org/en/latest/sandbox-permissions.html#portals) are the intended route for file selection and grant access to chosen files; GTK can use them transparently, but the Firefox file picker has not yet been checked on GNOME/KDE portals. Downloads, Wayland/X11 selection, GPU acceleration, audio, and portal file access have not been exercised in this package.

uBlock Origin remains its original signed extension. The package contains its signed XPI; Firefox AddonManager remains responsible for extension updates and needs network access. Update behavior in Flatpak has not yet been tested. Extensions that rely on a host-side native messaging application, including some password-manager integrations, may not work: the sandbox cannot freely launch or inspect arbitrary host programs. Such integration requires a Flatpak-aware native host and explicit, narrowly scoped permissions; this manifest does not add those permissions.

The package copies the browser distribution and its existing notices unchanged. The project remains MPL-2.0; Mozilla/Firefox and Zen notices remain with their components, and uBlock Origin retains its upstream GPL-3.0-only license and attribution in the signed XPI. Flatpak metadata identifies the app license as MPL-2.0. Package build and physical-key runtime status are reported separately for each regenerated artifact.

## Flathub source-build proposal: not ready for submission

Flathub’s current requirements say source-available applications must be built from source, all build dependencies must be declared as fetchable sources, and the build runs without network access. Submission PRs must not contain precompiled binaries; new submissions target the stable repository, and the manifest must use the newest hosted runtime. See [Flathub’s requirements](https://docs.flathub.org/docs/for-app-authors/requirements) and [submission checks](https://docs.flathub.org/docs/for-app-authors/submission).

The direct test bundle above takes `dist/zen-*.tar.xz` as its input, so it is not suitable for Flathub. A local source-build proposal is in [`packaging/flathub-proposal/io.github.martin08abm.umbralbrowser.yml`](../packaging/flathub-proposal/io.github.martin08abm.umbralbrowser.yml). It points at the public Umbral source revision and the pinned Firefox 158.0.1 **source archive**, not the generated browser archive or Flatpak bundle. Its runtime/BaseApp are set to 26.08, the newest Flathub runtime branch checked on 2026-11-04; the matching Firefox BaseApp branch exists.

This file is a proposal sketch, not a buildable or submit-ready manifest. The pinned Mozilla source archive URL returned HTTP 200; its SHA-256 is recorded from Surfer’s retained copy, but a Flathub-builder fetch has not been run. The clean Firefox base commit documented in [`engine-source-bases.md`](engine-source-bases.md) exists only in the local `engine/` repository, which has no remote, so the proposal uses the matching upstream source archive instead. Surfer’s existing build flow also downloads toolchains during `bootstrap`, and npm, Rust/Cargo, Python and Mozilla build dependencies have not yet been fully enumerated for Flathub’s offline builder. The persistent project source also contains the AMO-signed uBlock XPI; its treatment must be reconciled with Flathub’s source-only policy before submission. A reproducible offline toolchain/dependency manifest must be completed while keeping `surfer.json` pinned at Firefox 158.0.1.

Before any submission, establish a stable release, build and test the manifest with Flathub’s builder and linter, ensure the manifest is at the repository root, check both Flathub architectures, and review permissions. In particular, `--device=all` is needed for the current Firefox hidraw WebAuthn path but exposes all `/dev` device nodes, and `--allow=devel` is another broad permission to justify or remove. Flathub’s policy also requires a stable submission and a human-managed review; this preparation does not publish or submit anything.

## Windows x86_64: portable ZIP artifact

1. Open [Actions](https://github.com/Martin08ABM/umbral-browser/actions) in the Umbral repository.
2. Select **Manual Windows x86_64 test build**, choose **Run workflow**, and provide a test version label if desired.
3. When it finishes, download the `umbral-windows-x86_64` Actions artifact. GitHub downloads an outer artifact ZIP; extract it once to get `umbral-windows-x86_64.zip`, then extract that portable browser ZIP. The artifact is retained for three days and is not a public release.
4. In PowerShell, from the extracted browser files, create and use a dedicated profile:

```powershell
$profilePath = Join-Path $env:LOCALAPPDATA 'Umbral\TestProfile'
New-Item -ItemType Directory -Force -Path $profilePath | Out-Null
$browser = Get-ChildItem -Path . -Filter zen.exe -Recurse | Select-Object -First 1
if (-not $browser) { throw 'zen.exe was not found in the extracted package' }
& $browser.FullName -no-remote -profile $profilePath
```

This is a portable ZIP with no installer. The `-no-remote` flag and explicit profile path keep the test session separate from Firefox and Zen profiles. The workflow produces the ZIP from `npm run package`, checks its archive contents, executable architecture and signed uBlock XPI, then uploads it as `umbral-windows-x86_64`.

### Manually update an existing portable installation

There is no automatic updater. To try a newer workflow build while keeping the profile already used by your Umbral shortcut:

1. Close every Umbral window and wait for `zen.exe` to exit in Task Manager.
2. Run the **Manual Windows x86_64 test build** workflow and download its `umbral-windows-x86_64` artifact before the three-day retention expires.
3. Extract GitHub’s outer artifact ZIP, then extract the inner `umbral-windows-x86_64.zip` into a temporary folder.
4. Copy the extracted browser files over the existing Umbral installation folder and allow file overwrites. Do not remove or replace the profile directory. If your shortcut passes `-profile`, keep the same path and arguments; otherwise reopen `zen.exe` the same way you used before.

The workflow creates test artifacts only. There is no public Windows download page or production release to link to yet.

The build is unsigned. Windows may identify it as an unknown publisher or show a SmartScreen warning; Smart App Control can block unsigned executables under some configurations. The workflow does not disable or alter those protections. Windows signing would require an Authenticode signing identity and protected signing credentials.

## What the workflows build

The Windows workflow follows the existing Zen release-build setup and runs on Ubuntu. It obtains Wine and a Visual Studio 2026 sysroot with the Windows SDK through Mozilla’s `get_vs.py`, bootstraps Clang, installs the pinned Rust MSVC target and downloads the Windows API bindings version named by the source tree. The workflow checks those paths before compiling.

The Windows workflow validates the portable ZIP, required browser bundle, included signed uBlock XPI and executable architecture before upload.

The imported Umbral sources include the homepage, search configuration and SearXNG setup, Firefox ETP settings and ETP statistics service, and the original signed uBlock Origin XPI. New profiles default Firefox Accounts off and hide its account entry points. Windows `.ico`/Start tiles are supplied by the persistent Umbral platform-icon patch. The Linux launcher uses the Umbral icon from the packaged browser.

## Runner resources and artifact lifetime

The workflows use GitHub’s standard `ubuntu-24.04` hosted runner and reclaim cached runtimes and large preinstalled packages before checkout. They stop before downloading/building if less than 40 GiB is free, recheck for 30 GiB before compilation, and require 4 GiB before packaging. Mozilla documents 30 GiB free for a Linux Firefox build; the guard uses that minimum after source and cross-toolchains are present. The checks fail early if the runner image or cleanup leaves less than the build budget, instead of running out of disk partway through. The cleanup action reports up to 31 GiB reclaimed on a typical Ubuntu runner, with roughly 6 GiB more when cached runtimes are also removed; that is not a guaranteed amount, which is why the workflow checks actual free space. On public repositories, GitHub lists the standard Linux runner at 4 CPUs, 16 GB RAM, and 14 GB SSD, and its use is free. GitHub-hosted jobs have a six-hour limit. If an early disk guard fails, use an eligible larger runner with more storage; availability depends on the account plan, and larger runners are billed separately, including for public repositories. These workflows do not depend on the inherited Blacksmith runner labels.

The workflows retain artifacts for three days to limit storage use. GitHub Free currently includes 500 MB of Actions artifact storage, shared by the account’s repositories. Download the artifact before it expires; no release or public download page is created.

Runner labels and limits: [GitHub-hosted runner specifications](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [Actions limits and storage](https://docs.github.com/en/actions/reference/limits).
