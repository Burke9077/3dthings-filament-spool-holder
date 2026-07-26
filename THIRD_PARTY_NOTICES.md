# Third-party notices

The GitHub Pages customizer distributes the official OpenSCAD WebAssembly
runtime so STL generation can happen locally in a browser.

- Component: OpenSCAD WebAssembly runtime
- Version: 2026.07.24 snapshot
- Project: <https://github.com/openscad/openscad>
- Binary source: <https://files.openscad.org/snapshots/OpenSCAD-2026.07.24-WebAssembly-web.zip>
- License: GNU General Public License version 2 or later

The build downloads the official binary and license, verifies the published
SHA-256 checksum, and includes both in the deployed Pages artifact. Exact
provenance is also published at
`public/vendor/openscad/SOURCE.txt`.

The customizer itself and the spool-holder design remain MIT licensed. Runtime
licenses do not change the license of generated holder geometry.
