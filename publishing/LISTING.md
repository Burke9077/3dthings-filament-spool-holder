# Parametric filament spool holder

> Copy-ready marketplace text. Update it after the physical acceptance print
> and add real photos before publishing.

## Short summary

A compact, support-free filament spool holder with captive M3 nut pockets,
independent axles, and optional clips for linking multiple holders. Customize
the spool diameter, width, fit, and module count directly in a browser.

## Description

This open-frame holder is a multipart FDM design built in OpenSCAD. It keeps
material around the load paths while omitting cosmetic panels and branding.

Each holder remains a complete independent module. Two clips connect each
adjacent pair, so one spool can be changed without disturbing its neighbor.

The browser customizer generates the configured STLs locally:

https://burke9077.github.io/3dthings-filament-spool-holder/

The editable OpenSCAD source and release history are available here:

https://github.com/Burke9077/3dthings-filament-spool-holder

## Printed parts

Per holder:

- 2 side frames
- 2 crossrails
- 1 axle
- 2 axle caps

Additional parts:

- 2 link clips per adjacent holder pair
- 1 nut-fit test before printing the structural parts

## Hardware

Per holder:

- 4 M3 hex nuts
- 4 M3 × 10 mm socket screws

## Print notes

- 0.20 mm layer height
- 4 top and bottom layers
- 25% gyroid or cubic infill
- PLA, PETG, or ASA
- No supports

Print the nut-fit test with the intended material and profile first. Side
frames print flat with their shallow rail recesses upward. Crossrails print on
their broad face with the nut openings upward. Print the axle horizontally,
caps flange-down, and clips flat.

## Assembly

1. Place both crossrails with their nut openings upward.
2. Drop one M3 nut into each of the four hex pockets.
3. Seat both rails in one side frame, then add the second frame with its
   shallow recesses facing inward.
4. Install and evenly tighten four M3 screws on a flat surface.
5. Pass the axle through the spool, lower it into the cradles, and add both
   caps.
6. For multiple holders, connect neighboring frames with one front and one
   rear link clip.

## Suggested tags

`filament`, `spool holder`, `3d printer`, `openscad`, `parametric`, `modular`,
`m3`, `support free`

## License

MIT. See the included `LICENSE` file.
