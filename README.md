# Parametric filament spool holder

A compact, open-frame filament spool holder designed in OpenSCAD. It takes the
useful layout of common laser-cut desktop holders—a spool axle between two side
frames—and redesigns it as a support-free multipart FDM print.

The model is intentionally unbranded and omits cosmetic panels. Material is
placed only around the load paths, axle cradles, rail sockets, and narrow bottom
ties.

![Rendered assembly](docs/assembly.png)

## Browser customizer

Use the hosted customizer at
[burke9077.github.io/3dthings-filament-spool-holder](https://burke9077.github.io/3dthings-filament-spool-holder/).
Set the spool outside diameter, center-hole diameter, and outside width; choose
one to four linked holders; then download the complete print-pack ZIP. The
holder adds side clearance and raises the axle until the complete spool
envelope clears both unchanged crossrails and the table. Advanced controls
expose those clearances, print-bed size, axle diameter, M3 nut dimensions, and
part-fit clearances.

The live 3D assembly rebuilds automatically after settings change. The
part-fit clearance preset changes only mating tolerances—rail sockets, nut
pockets, screw bores, axle caps, and link clips—not print speed, layers,
infill, or strength.

Optional downloads for the nut-fit test, one holder module, link clips, and
individual replacement parts are kept under a secondary menu. Each ZIP carries
the outside diameter, maximum bore, spool width, base depth, crossrail
clearance, and copy counts in its filenames and manifest. The on-page guide
covers print orientation and assembly.

The customizer runs the official OpenSCAD WebAssembly build entirely in the
browser. Dimensions and generated geometry stay on the device; there is no
model-generation server.

## Features

- Parameterized spool outside diameter, center-hole diameter, outside width,
  base depth, rigid-part clearances, frame, axle, fit, and M3 hardware
  dimensions
- Collision-aware axle height derived against the table and complete
  crossrail top plane, with analytic assertions and mesh-level regression
  checks
- Two identical side frames and two identical crossrails
- Shouldered rail tenons that seat in blind inside-face frame sockets
- Drop-in M3 hex-nut traps that become captive inside those sockets
- Removable printed axle with press-fit end caps
- Repeatable side-by-side link clips that preserve independent spool changes
- Flat, support-free print orientations for every part
- Small nut-fit test piece for calibrating a printer before committing to the rails
- Automatically updating browser-side 3D preview
- OpenSCAD Customizer support and command-line STL export

The defaults accept a spool up to 220 mm outside diameter, 60 mm center hole,
and 115 mm outside width. Five millimeters beside each face produces 125 mm
between the frames. The generator guarantees at least 15 mm above the complete
crossrail top plane; that constraint governs the default axle-center height of
172 mm. The worst-case spool bottom is therefore 41 mm above the table and
15 mm above the 26 mm crossrails. The assembly preview shows that maximum
envelope hanging from the axle, just as the physical spool does.

Both diameters matter. The axle supports the upper inside edge of the spool
hole, so the spool center hangs below the axle by half the difference between
the hole and axle diameters. The spool must also clear the crossrails, not
merely the table. The design therefore uses:

```text
spool radius       = outside diameter / 2
rail top           = rail center height + rail height / 2

floor-limited center = spool radius + floor clearance
rail-limited center  = rail top + spool radius + rail clearance

spool center = max(floor-limited center, rail-limited center)
axle height  = spool center
             + (center-hole diameter - axle diameter) / 2
```

The rail rule deliberately treats the entire horizontal plane at the
crossrails' top surface as occupied. This is more conservative than relying on
their lateral position and guarantees that the spool's lowest point clears
both rails even with a non-ideal printed flange. Enter the largest outside
diameter, center hole, and width among the spools you intend to use. Every
spool hole must also be larger than the selected axle diameter.

## Bill of materials

| Item | Quantity | Notes |
| --- | ---: | --- |
| Side frame | 2 | Identical prints |
| Crossrail | 2 | Identical prints; nut openings face upward |
| Axle | 1 | Printed horizontally |
| Axle cap | 2 | Press fit; print closed face on the bed |
| Link clip | 2 per adjacent pair | Optional; one front and one rear |
| M3 hex nut | 4 | Standard 5.5 mm across-flats nut |
| M3 × 10 mm socket-head screw | 4 | M3 × 8 mm also works with most nuts |

## Generate the parts

Open `filament_spool_holder.scad`, choose a value for `part` in the Customizer,
then render and export the STL. Print the quantities listed above.

From a shell with OpenSCAD installed:

```sh
make stls
```

Generated files go into `build/`, which is intentionally not committed. To
regenerate the documentation render:

```sh
make preview
```

## Release preparation

Marketplace publication is held until a complete physical print has been
assembled and approved. The manually triggered **Prepare release** workflow
builds an inspectable release candidate by default; it cannot create a public
GitHub Release without the physical-test confirmation.

See [PUBLISHING.md](PUBLISHING.md) for the release gate, marketplace research,
and first-publication checklist. Build the same candidate locally with:

```sh
make release
```

## Calibrate before printing

Print `build/nut_fit_test.stl` first:

```sh
make build/nut_fit_test.stl
```

A nut should drop into the top opening without rotating in its hex pocket, and
an M3 screw should pass through the horizontal bore. Adjust
`m3_nut_clearance` or `m3_hole_diameter` if needed. The defaults target a
reasonably tuned FDM printer; dimensional behavior varies by material and
machine. In the browser customizer, choose **Extra clearance** when mating
parts bind or **Reduced clearance** when they feel loose.

## Suggested print settings

- 0.20 mm layer height
- 4 top and bottom layers
- 25% gyroid or cubic infill
- PLA, PETG, or ASA
- No supports

Print each side frame flat with its two shallow rail recesses upward. Print each
rail on its broad face with both nut openings upward. The axle has a faceted
flat and is already oriented horizontally; a brim can help with low-adhesion
materials. Print caps with the closed flange against the bed and the socket
upward.

## Assembly

1. Set both crossrails down with their nut openings facing up.
2. Drop an M3 nut into each of the four hex pockets.
3. Seat both shouldered tenons in the shallow recesses on one side frame, then
   add the second frame with its recesses facing inward.
4. Install the four M3 screws through the small holes on the outside faces.
   Square the holder on a flat surface and tighten them evenly.
5. Slide the axle through the spool and lower it into the open cradles. Confirm
   that the axle bears on the upper inside edge of the spool hole while the
   spool clears the floor and both crossrails, then press a cap onto each end.

The blind side-frame sockets cover the nut openings after assembly, so the nuts
cannot escape or turn. The rail shoulders bear against the inside frame faces;
tightening each screw therefore clamps the joint instead of merely retaining
it.

## Link two or more holders

Keep each holder complete, including both side frames and its own axle. Put two
holders side by side, leaving the facing outside frames separated by
`link_gap`, then press one link clip over the two front frame edges and a second
clip over the rear edges. The rounded lower frame corners locate the clips
vertically.

The default 32 mm gap leaves clearance between two facing axle caps. Each
additional holder needs two more clips:

| Holders | Link clips |
| ---: | ---: |
| 1 | 0 |
| 2 | 2 |
| 3 | 4 |
| 4 | 6 |

This deliberately keeps each axle independent. A shared center frame or single
long axle would save one frame, but changing one spool would disturb its
neighbor.

## Important parameters

| Parameter | Default | Purpose |
| --- | ---: | --- |
| `spool_max_diameter` | 220 mm | Largest supported spool outside diameter |
| `spool_max_bore_diameter` | 60 mm | Largest supported spool center hole; contributes to axle height |
| `spool_max_width` | 115 mm | Largest supported width across both outside flanges |
| `spool_side_clearance` | 5 mm/side | Added beside the spool; derives 125 mm clear frame spacing |
| `base_depth` | 175 mm | Front-to-back footprint |
| `spool_floor_clearance` | 15 mm | Minimum vertical gap above the table |
| `spool_rail_clearance` | 15 mm | Minimum vertical gap above the complete crossrail top plane |
| `frame_thickness` | 8 mm | Thickness of each flat side frame |
| `frame_web` | 14 mm | Minimum structural web around the large cutout |
| `axle_diameter` | 18 mm | Printed axle diameter |
| `axle_facets` | 32 | Round axle profile with a narrow printable flat |
| `rail_fit_clearance` | 0.30 mm | Per-side clearance in frame sockets |
| `m3_nut_clearance` | 0.25 mm | Per-side nut-pocket clearance |
| `axle_cap_fit_clearance` | 0.25 mm | Diametral cap socket clearance |
| `link_gap` | 32 mm | Gap between linked modules |
| `link_fit_clearance` | 0.15 mm | Per-side clearance around linked frames |
| `holder_count` | 2 | Complete modules shown in `linked_assembly` |

Changing the outside diameter, center hole, base depth, or either rigid-part
clearance automatically updates the side-frame axle height. Changing spool
width or side clearance updates the rail and axle lengths. OpenSCAD assertions
and generated-mesh collision tests reject combinations that would intersect
the table or crossrails, cut rail sockets through the frame, leave too little
material around the axle, or make the spool hole incompatible with the axle.

## License

The design and customizer are licensed under the [MIT License](LICENSE).
