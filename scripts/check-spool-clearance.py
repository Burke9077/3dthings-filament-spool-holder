#!/usr/bin/env python3

"""Mesh-check the configured spool keepout against fixed holder parts."""

from pathlib import Path
import subprocess
import tempfile


REPO_ROOT = Path(__file__).resolve().parent.parent
SCAD_PATH = REPO_ROOT / "filament_spool_holder.scad"
CONFIGURATIONS = (
    ("default", {}),
    (
        "measured-200d-54b",
        {
            "spool_max_diameter": 200,
            "spool_max_bore_diameter": 54,
            "spool_max_width": 70,
            "base_depth": 160,
        },
    ),
    (
        "small",
        {
            "spool_max_diameter": 120,
            "spool_max_bore_diameter": 20,
            "spool_max_width": 30,
            "base_depth": 140,
        },
    ),
    (
        "large",
        {
            "spool_max_diameter": 250,
            "spool_max_bore_diameter": 80,
            "spool_max_width": 140,
            "base_depth": 200,
        },
    ),
    (
        "maximum",
        {
            "spool_max_diameter": 300,
            "spool_max_bore_diameter": 120,
            "spool_max_width": 200,
            "base_depth": 240,
        },
    ),
)


def run_collision_mesh(output_path: Path, definitions: dict[str, float]) -> subprocess.CompletedProcess[str]:
    command = [
        "openscad",
        "--check-parameters=true",
        "-o",
        str(output_path),
        "-D",
        'part="clearance_keepout_test"',
    ]
    for name, value in definitions.items():
        command.extend(("-D", f"{name}={value}"))
    command.append(str(SCAD_PATH))
    return subprocess.run(
        command,
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def assert_clear(name: str, definitions: dict[str, float], temp_dir: Path) -> None:
    output_path = temp_dir / f"{name}.stl"
    result = run_collision_mesh(output_path, definitions)
    output = result.stdout + result.stderr
    if (
        result.returncode != 1
        or "Current top level object is empty." not in output
        or output_path.exists()
    ):
        raise SystemExit(
            f"{name}: clearance keepout produced a collision mesh\n{output}"
        )


def assert_failed_candidate_violates_keepout(temp_dir: Path) -> None:
    output_path = temp_dir / "failed-candidate-keepout.stl"
    result = run_collision_mesh(
        output_path,
        {
            "spool_max_diameter": 200,
            "spool_max_bore_diameter": 54,
            "spool_max_width": 70,
            "base_depth": 175,
            # The failed wall's 143 mm axle center puts this spool's
            # center at 125 mm and its bottom at 25 mm. The rail top is
            # 26 mm, violating the conservative full-top-plane rule.
            "clearance_test_spool_center_height": 125,
            # Test the nominal spool envelope, without an added margin.
            "spool_rail_clearance": 0,
        },
    )
    if result.returncode != 0 or not output_path.is_file() or output_path.stat().st_size == 0:
        output = result.stdout + result.stderr
        raise SystemExit(
            "Failed candidate did not violate the rail-top-plane keepout\n"
            + output
        )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="spool-clearance-") as directory:
        temp_dir = Path(directory)
        for name, definitions in CONFIGURATIONS:
            assert_clear(name, definitions, temp_dir)
        assert_failed_candidate_violates_keepout(temp_dir)

    print(
        "Spool keepout mesh verified across 5 configurations; "
        "failed candidate violates the full rail-top-plane keepout."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
