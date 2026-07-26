#!/usr/bin/env bash

set -euo pipefail

version_label="${1:-unreleased}"

if [[ ! "$version_label" =~ ^(unreleased|v[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?)$ ]]; then
  echo "Version must be 'unreleased' or a semantic version such as v0.1.0." >&2
  exit 2
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
release_root="$repo_root/build/release"
package_name="parametric-filament-spool-holder-$version_label"
package_dir="$release_root/$package_name"
assets_dir="$release_root/assets"
source_epoch="${SOURCE_DATE_EPOCH:-$(git -C "$repo_root" show -s --format=%ct HEAD)}"
commit_sha="$(git -C "$repo_root" rev-parse HEAD)"
generated_at="$(date --utc --date="@$source_epoch" "+%Y-%m-%dT%H:%M:%SZ")"
source_state="clean"

if [[ -n "$(git -C "$repo_root" status --porcelain --untracked-files=normal)" ]]; then
  source_state="dirty (unreleased candidate only)"
  if [[ "$version_label" != "unreleased" ]]; then
    echo "Versioned release candidates require a clean working tree." >&2
    exit 2
  fi
fi

rm -rf -- "$release_root"
mkdir -p "$package_dir/models" "$package_dir/source" "$package_dir/images" "$assets_dir"

make -C "$repo_root" check
for image in "$repo_root/docs/assembly.png" "$repo_root/docs/linked-assembly.png"; do
  test -s "$image"
done

if [[ "$source_state" == "clean" ]] \
  && [[ -n "$(git -C "$repo_root" status --porcelain --untracked-files=normal)" ]]; then
  source_state="dirty after generation (unreleased candidate only)"
  if [[ "$version_label" != "unreleased" ]]; then
    echo "Generation changed tracked files; commit those changes before releasing." >&2
    exit 2
  fi
fi

cp "$repo_root"/build/*.stl "$package_dir/models/"
cp "$repo_root/filament_spool_holder.scad" "$package_dir/source/"
cp "$repo_root/README.md" "$repo_root/LICENSE" "$repo_root/PUBLISHING.md" "$package_dir/"
cp "$repo_root/publishing/LISTING.md" "$package_dir/"
cp "$repo_root"/docs/*.png "$package_dir/images/"

{
  printf 'PARAMETRIC FILAMENT SPOOL HOLDER\n'
  printf 'Version: %s\n' "$version_label"
  printf 'Commit: %s\n' "$commit_sha"
  printf 'Source tree: %s\n' "$source_state"
  printf 'Generated: %s\n\n' "$generated_at"
  printf 'DEFAULT ENVELOPE\n'
  printf 'Maximum spool diameter: 220 mm\n'
  printf 'Clear width: 125 mm\n\n'
  printf 'PRINT QUANTITIES PER HOLDER\n'
  printf '2  side_frame.stl\n'
  printf '2  crossbar.stl\n'
  printf '1  axle.stl\n'
  printf '2  axle_cap.stl\n'
  printf '2  link_clip.stl per adjacent pair\n'
  printf '1  nut_fit_test.stl before structural parts\n\n'
  printf 'HARDWARE PER HOLDER\n'
  printf '4  M3 hex nuts\n'
  printf '4  M3 x 10 mm socket screws\n\n'
  printf 'CUSTOMIZER\n'
  printf 'https://burke9077.github.io/3dthings-filament-spool-holder/\n'
} > "$package_dir/MANIFEST.txt"

(
  cd "$package_dir"
  find . -type f ! -name SHA256SUMS -print0 \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum > "$release_root/package-sha256.tmp"
)
mv "$release_root/package-sha256.tmp" "$package_dir/SHA256SUMS"

find "$package_dir" -exec touch -h --date="@$source_epoch" {} +

archive_path="$assets_dir/$package_name.zip"
(
  cd "$release_root"
  find "$package_name" -type f -print \
    | LC_ALL=C sort \
    | zip -X -q "$archive_path" -@
)

cp "$repo_root"/build/*.stl "$assets_dir/"
cp "$repo_root/filament_spool_holder.scad" "$assets_dir/"
cp "$repo_root"/docs/*.png "$assets_dir/"
cp "$package_dir/MANIFEST.txt" "$assets_dir/"

(
  cd "$assets_dir"
  find . -maxdepth 1 -type f ! -name RELEASE-SHA256SUMS.txt -printf '%f\0' \
    | LC_ALL=C sort -z \
    | xargs -0 sha256sum > "$release_root/release-sha256.tmp"
)
mv "$release_root/release-sha256.tmp" "$assets_dir/RELEASE-SHA256SUMS.txt"

zip -T "$archive_path" >/dev/null

printf 'Release candidate built at %s\n' "$assets_dir"
