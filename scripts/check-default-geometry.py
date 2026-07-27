#!/usr/bin/env python3

"""Verify the printable bounds of the default side frame."""

from pathlib import Path
import re
import sys


EXPECTED_SIZE = (175.0, 149.507, 8.0)
TOLERANCE = 0.02
VERTEX_PATTERN = re.compile(
    rb"^\s*vertex\s+"
    rb"([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s*$",
    re.MULTILINE,
)


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "build/side_frame.stl")
    matches = VERTEX_PATTERN.findall(path.read_bytes())
    if not matches:
        raise SystemExit(f"{path}: expected an ASCII STL with vertex records")

    vertices = [tuple(float(value) for value in match) for match in matches]
    minimum = tuple(min(vertex[axis] for vertex in vertices) for axis in range(3))
    maximum = tuple(max(vertex[axis] for vertex in vertices) for axis in range(3))
    size = tuple(maximum[axis] - minimum[axis] for axis in range(3))

    for axis, (actual, expected) in enumerate(zip(size, EXPECTED_SIZE)):
        if abs(actual - expected) > TOLERANCE:
            raise SystemExit(
                f"{path}: axis {axis} is {actual:.3f} mm; "
                f"expected {expected:.3f} ± {TOLERANCE:.3f} mm"
            )

    formatted = " × ".join(f"{value:.3f}" for value in size)
    print(f"Default side-frame bounds verified: {formatted} mm")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
