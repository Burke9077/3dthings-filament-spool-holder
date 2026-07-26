#!/usr/bin/env bash
set -euo pipefail

version=2026.07.24
archive="OpenSCAD-${version}-WebAssembly-web.zip"
archive_url="https://files.openscad.org/snapshots/${archive}"
expected_sha256=663a3259939ece4bfe28a6a7af2e8b5d87a102209fd28821a79c60257cbf45f0
destination=public/vendor/openscad
marker="${destination}/.source-sha256"

if [[ -s "${destination}/openscad.js" &&
      -s "${destination}/openscad.wasm" &&
      -f "$marker" &&
      "$(tr -d '\n' < "$marker")" == "$expected_sha256" ]]; then
  exit 0
fi

temporary_directory=$(mktemp -d /tmp/spool-holder-openscad-wasm.XXXXXX)
trap 'rm -rf -- "$temporary_directory"' EXIT

curl --fail --location --silent --show-error \
  "$archive_url" \
  -o "${temporary_directory}/${archive}"

printf '%s  %s\n' \
  "$expected_sha256" \
  "${temporary_directory}/${archive}" \
  | sha256sum --check --status

unzip -q \
  "${temporary_directory}/${archive}" \
  openscad.js openscad.wasm \
  -d "$temporary_directory"

curl --fail --location --silent --show-error \
  https://raw.githubusercontent.com/openscad/openscad/master/COPYING \
  -o "${temporary_directory}/COPYING"

mkdir -p "$destination"
mv "${temporary_directory}/openscad.js" "${destination}/openscad.js"
mv "${temporary_directory}/openscad.wasm" "${destination}/openscad.wasm"
mv "${temporary_directory}/COPYING" "${destination}/COPYING"
printf '%s\n' "$expected_sha256" > "$marker"
