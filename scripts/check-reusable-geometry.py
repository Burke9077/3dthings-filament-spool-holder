#!/usr/bin/env python3

"""Guard the meshes that must stay reusable with replacement side frames."""

from hashlib import sha256
from pathlib import Path
import re


# Triangle-set fingerprints captured from the owner-printed a66212f
# candidate. STL header/order differences are ignored by canonical_mesh_digest.
EXPECTED_CANONICAL_MESHES = {
    "crossbar.stl": "3eca1072c473af927463d9494f3308dc441b2ec483743205922cb79fe3b3bc9d",
    "axle.stl": "d1e37e150a635e1f5bc607577fe88c7f77071320ecf4c9b2e69e0eca17fd2478",
    "axle_cap.stl": "01df6c85e3fcea70f9662e33d04fabc7fec34d9c7b3d23d29f5b3dea9ba0d775",
    "link_clip.stl": "1a2a907cfec9bd4f6b3ff4f766f468e12530b1feb04ba48ffcbc7ef77f5d435a",
}
VERTEX_PATTERN = re.compile(
    rb"^\s*vertex\s+"
    rb"([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*$",
    re.MULTILINE,
)


def canonical_mesh_digest(path: Path) -> str:
    matches = VERTEX_PATTERN.findall(path.read_bytes())
    if not matches or len(matches) % 3:
        raise SystemExit(f"{path}: invalid ASCII STL vertex count")

    vertices = [tuple(float(value) for value in match) for match in matches]
    triangles = sorted(
        tuple(sorted(vertices[offset : offset + 3]))
        for offset in range(0, len(vertices), 3)
    )
    return sha256(repr(triangles).encode()).hexdigest()


def main() -> int:
    for filename, expected in EXPECTED_CANONICAL_MESHES.items():
        path = Path("build") / filename
        actual = canonical_mesh_digest(path)
        if actual != expected:
            raise SystemExit(
                f"{path}: reusable mesh changed\n"
                f"actual:   {actual}\n"
                f"expected: {expected}"
            )

    print("Reusable crossbars, axle, caps, and link clips are unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
