/*
 * Parametric multipart filament spool holder
 *
 * SPDX-License-Identifier: MIT
 *
 * Print quantities:
 *   side_frame  x2
 *   crossbar    x2
 *   axle        x1
 *   axle_cap    x2
 *   link_clip   x2 per adjacent holder pair (optional)
 *
 * Hardware:
 *   M3 x 10 mm socket-head screw x4
 *   Standard M3 hex nut x4
 */

// [Output]

// Object to display or export.
part = "assembly"; // [assembly,linked_assembly,side_frame,crossbar,axle,axle_cap,link_clip,nut_fit_test]

// Include a translucent example spool in the assembly view.
show_preview_spool = true;

// [Spool envelope]

// Maximum supported spool outside diameter.
spool_max_diameter = 220; // [120:1:300]

// Largest center-hole diameter among the spools this frame must support.
spool_max_bore_diameter = 60; // [20:1:120]

// Clear distance between the two side frames.
inside_width = 125; // [40:1:250]

// Front-to-back footprint of each side frame.
base_depth = 175; // [100:1:300]

// Gap under a spool at spool_max_diameter.
spool_floor_clearance = 12; // [2:1:40]

// [Side frames]

// Thickness of each frame when printed flat.
frame_thickness = 8; // [4:0.5:16]

// Structural material around the large side-frame opening.
frame_web = 14; // [8:1:30]

// Radius applied to the side-frame outside corners.
frame_corner_radius = 7; // [2:1:15]

// Height of the vertical lower shoulders before the frame tapers.
frame_shoulder_height = 34; // [20:1:70]

// Height of the narrow tie below the large material-saving opening.
base_tie_height = 11; // [6:1:25]

// Material surrounding the axle cradle.
axle_slot_wall = 7; // [4:1:15]

// [Crossrails]

// Front-to-back size of each rail.
rail_depth = 20; // [12:1:35]

// Vertical size of each rail.
rail_height = 18; // [12:1:30]

// Distance from each end of the base to the rail center.
rail_inset = 16; // [10:1:40]

// Height of each rail center above the table.
rail_center_height = 17; // [10:1:35]

// Clearance on each side of a rail inside its frame socket.
rail_fit_clearance = 0.30; // [0.1:0.05:0.8]

// Depth of the shouldered tenon entering each blind frame socket.
rail_tenon_depth = 4; // [3:0.5:8]

// Reduction on every tenon edge, leaving a load-bearing rail shoulder.
rail_tenon_shoulder = 2.5; // [1.5:0.5:5]

// [Axle and caps]

// Diameter of the removable printed axle.
axle_diameter = 18; // [10:1:30]

// Facets on the support-free axle. Multiples of four give a useful flat.
axle_facets = 32; // [16:4:64]

// Radial clearance between the axle and each open cradle.
axle_slot_clearance = 0.35; // [0.1:0.05:1]

// Axle extending beyond each outside frame face.
axle_overhang = 11; // [6:1:25]

// Outside diameter of each removable axle cap.
axle_cap_diameter = 27; // [15:1:45]

// Length of axle captured inside a cap.
axle_cap_socket_depth = 8; // [4:1:16]

// Closed thickness at the outside end of a cap.
axle_cap_end_thickness = 3; // [2:0.5:8]

// Diametral clearance between the axle and cap socket.
axle_cap_fit_clearance = 0.25; // [0:0.05:0.8]

// [Modular linking]

// Number of complete modules shown in linked_assembly.
holder_count = 2; // [2:1:4]

// Clear distance between the facing outside frames of linked holders.
link_gap = 32; // [20:1:80]

// Height of each front/rear linking clip.
link_clip_height = 10; // [6:1:18]

// Frame-edge depth captured by a linking clip.
link_grip_depth = 5; // [3:0.5:10]

// Material in front of each pair of frame slots.
link_front_wall = 3; // [2:0.5:6]

// Material outside each captured frame.
link_end_wall = 3; // [2:0.5:6]

// Clearance on each side of a frame inside a linking clip.
link_fit_clearance = 0.15; // [0:0.05:0.8]

// [M3 hardware]

// Through-hole diameter for an M3 screw.
m3_hole_diameter = 3.4; // [3.0:0.05:4.2]

// Standard M3 nut width across opposite flats.
m3_nut_across_flats = 5.5; // [5.0:0.05:7.0]

// Standard M3 nut thickness.
m3_nut_thickness = 2.4; // [1.8:0.05:3.5]

// Clearance on each nut-pocket face.
m3_nut_clearance = 0.25; // [0.05:0.05:0.8]

// [Preview spool]

preview_spool_diameter = spool_max_diameter;
preview_spool_width = min(70, inside_width - 4);
preview_spool_bore = spool_max_bore_diameter;

/* [Hidden] */

epsilon = 0.02;
spool_center_drop =
    (spool_max_bore_diameter - axle_diameter) / 2;
preview_spool_center_drop =
    (preview_spool_bore - axle_diameter) / 2;
axle_height =
    spool_max_diameter / 2
        + spool_center_drop
        + spool_floor_clearance;
axle_slot_radius = axle_diameter / 2 + axle_slot_clearance;
frame_top = axle_height + axle_slot_radius + axle_slot_wall;
rail_center_offset = base_depth / 2 - rail_inset;
frame_outer_width = inside_width + 2 * frame_thickness;
rail_total_length = inside_width + 2 * rail_tenon_depth;
rail_tenon_cross_depth = rail_depth - 2 * rail_tenon_shoulder;
rail_tenon_height = rail_height - 2 * rail_tenon_shoulder;
rail_socket_depth = rail_tenon_depth + rail_fit_clearance;
axle_length = frame_outer_width + 2 * axle_overhang;
minimum_link_gap =
    2 * (axle_overhang + axle_cap_end_thickness) + 4;
link_clip_length =
    link_gap + 2 * frame_thickness + 2 * link_end_wall;
link_clip_depth = link_front_wall + link_grip_depth;
link_slot_center_offset = link_gap / 2 + frame_thickness / 2;
link_mount_height = frame_corner_radius;
axle_print_center_z =
    axle_diameter / 2 * cos(180 / axle_facets);
window_corner_radius = min(6, frame_web / 2);
window_half_width =
    rail_center_offset
        - rail_tenon_cross_depth / 2
        - frame_web * 0.60;
window_top = axle_height - axle_slot_radius - axle_slot_wall - 1;
nut_pocket_length = m3_nut_thickness + 2 * m3_nut_clearance;
nut_pocket_width = m3_nut_across_flats + 2 * m3_nut_clearance;
nut_pocket_corner_diameter =
    nut_pocket_width / cos(30);

assert(spool_max_diameter > axle_diameter,
       "spool_max_diameter must exceed axle_diameter");
assert(spool_max_bore_diameter > axle_diameter,
       "spool_max_bore_diameter must exceed axle_diameter");
assert(spool_max_bore_diameter < spool_max_diameter - 8,
       "Leave at least 4 mm of spool flange outside the center bore");
assert(preview_spool_bore > axle_diameter,
       "preview_spool_bore must exceed axle_diameter");
assert(base_depth > 2 * (rail_inset + rail_depth / 2),
       "base_depth is too small for the selected rail placement");
assert(rail_center_height - rail_height / 2 >= 3,
       "Leave at least 3 mm below the rail sockets");
assert(rail_center_height + rail_height / 2 <
       frame_shoulder_height,
       "Rail sockets must remain inside the vertical frame shoulders");
assert(rail_tenon_cross_depth > nut_pocket_width + 2,
       "Rail tenon is too narrow for the M3 nut pocket");
assert(rail_tenon_height > nut_pocket_corner_diameter + 2,
       "Rail tenon is too short for the M3 nut pocket");
assert(rail_socket_depth < frame_thickness - 2.5,
       "Blind rail socket must leave at least 2.5 mm at the outside face");
assert(window_half_width > window_corner_radius + 5,
       "Frame opening is too narrow; increase base_depth or reduce web/rail size");
assert(window_top > base_tie_height + 20,
       "Frame opening is too short for the selected spool envelope");
assert(axle_overhang >= axle_cap_socket_depth + 1,
       "axle_overhang must exceed cap socket depth");
assert(axle_cap_diameter > axle_diameter + 2,
       "axle caps need at least 1 mm of wall per side");
assert(holder_count >= 2 && holder_count <= 4
       && holder_count == floor(holder_count),
       "holder_count must be an integer from 2 through 4");
assert(link_gap >= minimum_link_gap,
       "link_gap is too small for two facing axle caps");
assert(link_grip_depth <
       rail_inset - rail_depth / 2 - 0.5,
       "Link clips would collide with the crossrails");
assert(link_clip_height <= frame_shoulder_height - link_mount_height,
       "Link clips must stay on the vertical lower frame edge");
assert(nut_pocket_length < rail_tenon_depth - 0.5,
       "Nut pocket is too thick for the rail tenon");

module rounded_outer_profile_2d() {
    half_depth = base_depth / 2;

    offset(r = frame_corner_radius)
        polygon([
            [-half_depth + frame_corner_radius,
             frame_corner_radius],
            [ half_depth - frame_corner_radius,
             frame_corner_radius],
            [ half_depth - frame_corner_radius,
             frame_shoulder_height - frame_corner_radius],
            [0, frame_top - frame_corner_radius],
            [-half_depth + frame_corner_radius,
             frame_shoulder_height - frame_corner_radius]
        ]);
}

module material_saving_window_2d() {
    offset(r = window_corner_radius)
        polygon([
            [-window_half_width + window_corner_radius,
             base_tie_height + window_corner_radius],
            [ window_half_width - window_corner_radius,
             base_tie_height + window_corner_radius],
            [0, window_top - window_corner_radius]
        ]);
}

module axle_cradle_cut_2d() {
    lead_in = 2;

    union() {
        translate([0, axle_height])
            circle(r = axle_slot_radius, $fn = 64);

        polygon([
            [-axle_slot_radius, axle_height],
            [-axle_slot_radius - lead_in, frame_top + epsilon],
            [ axle_slot_radius + lead_in, frame_top + epsilon],
            [ axle_slot_radius, axle_height]
        ]);
    }
}

module side_profile_2d() {
    difference() {
        rounded_outer_profile_2d();
        material_saving_window_2d();
        axle_cradle_cut_2d();
    }
}

module rail_mount_cuts() {
    for (side = [-1, 1]) {
        translate([
            side * rail_center_offset
                - rail_tenon_cross_depth / 2
                - rail_fit_clearance,
            rail_center_height
                - rail_tenon_height / 2
                - rail_fit_clearance,
            frame_thickness - rail_socket_depth
        ])
            cube([
                rail_tenon_cross_depth + 2 * rail_fit_clearance,
                rail_tenon_height + 2 * rail_fit_clearance,
                rail_socket_depth + epsilon
            ]);

        translate([
            side * rail_center_offset,
            rail_center_height,
            -epsilon
        ])
            cylinder(
                d = m3_hole_diameter,
                h = frame_thickness + 2 * epsilon,
                $fn = 32
            );
    }
}

module side_frame_print() {
    difference() {
        linear_extrude(
            height = frame_thickness,
            convexity = 10
        )
            side_profile_2d();

        rail_mount_cuts();
    }
}

module left_side_frame_assembly() {
    translate([
        -inside_width / 2 - frame_thickness,
        0,
        0
    ])
    rotate([90, 0, 90])
        side_frame_print();
}

module m3_nut_trap_at(x_position) {
    translate([x_position, 0, rail_height / 2])
        rotate([0, 90, 0])
            cylinder(
                d = nut_pocket_corner_diameter,
                h = nut_pocket_length,
                center = true,
                $fn = 6
            );

    translate([
        x_position - nut_pocket_length / 2,
        -nut_pocket_width / 2,
        rail_height / 2
    ])
        cube([
            nut_pocket_length,
            nut_pocket_width,
            rail_height / 2 + epsilon
        ]);
}

module rail_bolt_tunnel(length) {
    translate([-length / 2 - epsilon, 0, rail_height / 2])
        rotate([0, 90, 0])
            cylinder(
                d = m3_hole_diameter,
                h = length + 2 * epsilon,
                $fn = 32
            );
}

module crossbar_print() {
    difference() {
        union() {
            translate([
                -inside_width / 2,
                -rail_depth / 2,
                0
            ])
                cube([
                    inside_width,
                    rail_depth,
                    rail_height
                ]);

            for (side = [-1, 1])
                translate([
                    side * (
                        inside_width / 2 + rail_tenon_depth / 2
                    ),
                    0,
                    rail_height / 2
                ])
                    cube([
                        rail_tenon_depth,
                        rail_tenon_cross_depth,
                        rail_tenon_height
                    ], center = true);
        }

        rail_bolt_tunnel(rail_total_length);

        for (side = [-1, 1])
            m3_nut_trap_at(
                side * (
                    inside_width / 2 + rail_tenon_depth / 2
                )
            );
    }
}

module axle_body() {
    rotate([0, 90, 0])
        rotate([0, 0, 180 / axle_facets])
            cylinder(
                d = axle_diameter,
                h = axle_length,
                center = true,
                $fn = axle_facets
            );
}

module axle_print() {
    translate([0, 0, axle_print_center_z])
        axle_body();
}

module axle_cap_print() {
    cap_height = axle_cap_socket_depth + axle_cap_end_thickness;

    difference() {
        cylinder(
            d = axle_cap_diameter,
            h = cap_height,
            $fn = 64
        );

        translate([0, 0, axle_cap_end_thickness])
            rotate([0, 0, 180 / axle_facets])
                cylinder(
                    d = axle_diameter + axle_cap_fit_clearance,
                    h = axle_cap_socket_depth + epsilon,
                    $fn = axle_facets
                );
    }
}

module link_clip_print() {
    slot_width =
        frame_thickness + 2 * link_fit_clearance;

    difference() {
        translate([
            -link_clip_length / 2,
            0,
            0
        ])
            cube([
                link_clip_length,
                link_clip_depth,
                link_clip_height
            ]);

        for (side = [-1, 1])
            translate([
                side * link_slot_center_offset
                    - slot_width / 2,
                link_front_wall,
                -epsilon
            ])
                cube([
                    slot_width,
                    link_grip_depth + epsilon,
                    link_clip_height + 2 * epsilon
                ]);
    }
}

module right_axle_cap_assembly() {
    shaft_end = axle_length / 2;
    cap_length = axle_cap_socket_depth + axle_cap_end_thickness;

    difference() {
        translate([
            shaft_end - axle_cap_socket_depth,
            0,
            0
        ])
            rotate([0, 90, 0])
                cylinder(
                    d = axle_cap_diameter,
                    h = cap_length,
                    $fn = 64
                );

        translate([
            shaft_end - axle_cap_socket_depth - epsilon,
            0,
            0
        ])
            rotate([0, 90, 0])
                rotate([0, 0, 180 / axle_facets])
                    cylinder(
                        d = axle_diameter + axle_cap_fit_clearance,
                        h = axle_cap_socket_depth + epsilon,
                        $fn = axle_facets
                    );
    }
}

module preview_spool() {
    flange_thickness = 3;
    filament_diameter = preview_spool_diameter * 0.84;
    filament_width = preview_spool_width - 2 * flange_thickness;

    color([0.96, 0.42, 0.08, 0.52])
        rotate([0, 90, 0])
            difference() {
                cylinder(
                    d = filament_diameter,
                    h = filament_width,
                    center = true,
                    $fn = 96
                );
                cylinder(
                    d = preview_spool_bore,
                    h = filament_width + 2 * epsilon,
                    center = true,
                    $fn = 64
                );
            }

    color([0.12, 0.14, 0.17, 0.72])
        for (side = [-1, 1])
            translate([
                side * (preview_spool_width - flange_thickness) / 2,
                0,
                0
            ])
                rotate([0, 90, 0])
                    difference() {
                        cylinder(
                            d = preview_spool_diameter,
                            h = flange_thickness,
                            center = true,
                            $fn = 96
                        );
                        cylinder(
                            d = preview_spool_bore,
                            h = flange_thickness + 2 * epsilon,
                            center = true,
                            $fn = 64
                        );
                    }
}

module holder_assembly() {
    color([0.13, 0.43, 0.66]) {
        left_side_frame_assembly();
        mirror([1, 0, 0])
            left_side_frame_assembly();
    }

    color([0.16, 0.19, 0.22])
        for (side = [-1, 1])
            translate([
                0,
                side * rail_center_offset,
                rail_center_height - rail_height / 2
            ])
                crossbar_print();

    translate([0, 0, axle_height]) {
        color([0.72, 0.75, 0.78])
            axle_body();

        color([0.13, 0.43, 0.66]) {
            right_axle_cap_assembly();
            mirror([1, 0, 0])
                right_axle_cap_assembly();
        }

        if (show_preview_spool)
            translate([0, 0, -preview_spool_center_drop])
                preview_spool();
    }
}

module linked_assembly() {
    holder_spacing = frame_outer_width + link_gap;

    for (holder_index = [0 : holder_count - 1])
        translate([
            (
                holder_index
                - (holder_count - 1) / 2
            ) * holder_spacing,
            0,
            0
        ])
            holder_assembly();

    color([0.92, 0.47, 0.12])
        for (link_index = [0 : holder_count - 2]) {
            link_center =
                (
                    link_index
                    - (holder_count - 2) / 2
                ) * holder_spacing;

            translate([
                link_center,
                -base_depth / 2 - link_front_wall,
                link_mount_height
            ])
                link_clip_print();

            mirror([0, 1, 0])
                translate([
                    link_center,
                    -base_depth / 2 - link_front_wall,
                    link_mount_height
                ])
                    link_clip_print();
        }
}

module nut_fit_test() {
    test_length = 24;

    difference() {
        translate([-test_length / 2, -rail_depth / 2, 0])
            cube([test_length, rail_depth, rail_height]);

        rail_bolt_tunnel(test_length);
        m3_nut_trap_at(0);
    }
}

if (part == "assembly")
    holder_assembly();
else if (part == "linked_assembly")
    linked_assembly();
else if (part == "side_frame")
    side_frame_print();
else if (part == "crossbar")
    crossbar_print();
else if (part == "axle")
    axle_print();
else if (part == "axle_cap")
    axle_cap_print();
else if (part == "link_clip")
    link_clip_print();
else if (part == "nut_fit_test")
    nut_fit_test();
else
    assert(false, str("Unknown part: ", part));
