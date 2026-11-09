#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
archive_file="${1:-}"
app_id='io.github.martin08abm.umbralbrowser'
branch='stable'
runtime_version='25.08'
arch='x86_64'
build_root="$repo_root/dist/flatpak-build"
repo_dir="$repo_root/dist/flatpak-repo"
metadata_source="$repo_root/build/flatpak/metadata"

if [[ -z "$archive_file" ]]; then
  printf 'Usage: %s dist/zen-<version>.tar.xz\n' "$0" >&2
  exit 2
fi
[[ "$archive_file" = /* ]] || archive_file="$repo_root/$archive_file"
[[ -f "$archive_file" ]] || { printf 'Archive not found: %s\n' "$archive_file" >&2; exit 1; }
command -v flatpak >/dev/null
command -v python3 >/dev/null
command -v tar >/dev/null

python3 - "$archive_file" <<'PY'
import sys
import tarfile
import io
import zipfile

with tarfile.open(sys.argv[1], "r:xz") as archive:
    names = archive.getnames()
    if not any(name.endswith("/browser/omni.ja") or name == "browser/omni.ja" for name in names):
        raise SystemExit("Package does not contain browser/omni.ja")
    if not any(name.endswith("/distribution/extensions/uBlock0@raymondhill.net.xpi") for name in names):
        raise SystemExit("Package does not contain the bundled uBlock Origin XPI")
    xpi_name = next(name for name in names if name.endswith("/distribution/extensions/uBlock0@raymondhill.net.xpi"))
    xpi_member = archive.extractfile(xpi_name)
    if xpi_member is None:
        raise SystemExit("Could not read the bundled uBlock Origin XPI")
    with zipfile.ZipFile(io.BytesIO(xpi_member.read())) as xpi:
        xpi_names = set(xpi.namelist())
        if xpi.testzip() is not None or not {"META-INF/mozilla.rsa", "META-INF/mozilla.sf"}.issubset(xpi_names):
            raise SystemExit("Bundled uBlock Origin XPI is incomplete or lacks Mozilla signature files")
    executables = [name for name in names if name == "zen/zen" or name.endswith("/zen/zen")]
    if len(executables) != 1:
        raise SystemExit(f"Expected one zen/zen executable in the archive, found {len(executables)}")
    member = archive.extractfile(executables[0])
    if member is None or member.read(5) != b"\x7fELF\x02":
        raise SystemExit("Browser executable is not a 64-bit ELF binary")
    member.seek(0)
    header = member.read(20)
    if header[18:20] != b"\x3e\x00":
        raise SystemExit("Browser executable is not x86_64")
PY

rm -rf "$build_root" "$repo_dir"
flatpak build-init \
  --arch="$arch" \
  --base=org.mozilla.firefox.BaseApp \
  --base-version="$runtime_version" \
  "$build_root" "$app_id" org.freedesktop.Sdk org.freedesktop.Platform "$runtime_version"

mkdir -p "$build_root/files/umbral"
archive_root="$(mktemp -d "$repo_root/dist/flatpak-extract.XXXXXX")"
trap 'rm -rf "$archive_root"' EXIT
tar -xJf "$archive_file" -C "$archive_root"
cp -a "$archive_root/zen/." "$build_root/files/umbral/"
install -Dm0755 "$metadata_source/umbral-launcher" "$build_root/files/bin/umbral-launcher"
install -Dm0644 "$metadata_source/io.github.martin08abm.umbralbrowser.desktop" \
  "$build_root/files/share/applications/io.github.martin08abm.umbralbrowser.desktop"
install -Dm0644 "$metadata_source/io.github.martin08abm.umbralbrowser.metainfo.xml" \
  "$build_root/files/share/metainfo/io.github.martin08abm.umbralbrowser.metainfo.xml"
install -Dm0644 "$metadata_source/io.github.martin08abm.umbralbrowser.png" \
  "$build_root/files/share/icons/hicolor/512x512/apps/io.github.martin08abm.umbralbrowser.png"
install -Dm0644 "$metadata_source/LICENSE" \
  "$build_root/files/share/licenses/io.github.martin08abm.umbralbrowser/LICENSE"
install -Dm0644 "$metadata_source/CREDITS.md" \
  "$build_root/files/share/doc/io.github.martin08abm.umbralbrowser/CREDITS.md"

flatpak build-finish \
  --command=umbral-launcher \
  --allow=devel \
  --share=ipc \
  --share=network \
  --socket=pulseaudio \
  --socket=wayland \
  --socket=fallback-x11 \
  --device=all \
  --filesystem=xdg-download:rw \
  --env=DICPATH=/usr/share/hunspell \
  --talk-name=org.a11y.Bus \
  '--talk-name=org.gtk.vfs.*' \
  --talk-name=org.freedesktop.FileManager1 \
  '--own-name=org.mpris.MediaPlayer2.firefox.*' \
  "$build_root"
flatpak build-export --arch="$arch" --disable-sandbox "$repo_dir" "$build_root" "$branch"
bundle="$repo_root/dist/umbral-linux-x86_64.flatpak"
flatpak build-bundle \
  --arch="$arch" \
  --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo \
  "$repo_dir" "$bundle" "$app_id" "$branch"
printf 'Created %s\n' "$bundle"
