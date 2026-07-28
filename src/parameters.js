export const FIT_PRESETS = Object.freeze({
  tight: Object.freeze({
    railFitClearance: 0.2,
    nutClearance: 0.15,
    screwHoleDiameter: 3.25,
    capFitClearance: 0.15,
    linkFitClearance: 0.05,
  }),
  standard: Object.freeze({
    railFitClearance: 0.3,
    nutClearance: 0.25,
    screwHoleDiameter: 3.4,
    capFitClearance: 0.25,
    linkFitClearance: 0.15,
  }),
  loose: Object.freeze({
    railFitClearance: 0.45,
    nutClearance: 0.4,
    screwHoleDiameter: 3.6,
    capFitClearance: 0.4,
    linkFitClearance: 0.3,
  }),
});

export const DEFAULTS = Object.freeze({
  spoolDiameter: 220,
  spoolBoreDiameter: 60,
  spoolWidth: 115,
  sideClearance: 5,
  holderCount: 2,
  fitPreset: "standard",
  printBed: 220,
  autoBaseDepth: true,
  baseDepth: 175,
  floorClearance: 15,
  railClearance: 15,
  frameThickness: 8,
  frameWeb: 14,
  axleDiameter: 18,
  axleSlotClearance: 0.35,
  axleOverhang: 11,
  capEndThickness: 3,
  railTenonDepth: 4,
  railDepth: 20,
  railHeight: 18,
  railInset: 16,
  railCenterHeight: 17,
  railFitClearance: 0.3,
  nutAcrossFlats: 5.5,
  nutThickness: 2.4,
  nutClearance: 0.25,
  screwHoleDiameter: 3.4,
  capFitClearance: 0.25,
  linkGap: 32,
  linkFitClearance: 0.15,
});

export const SIZE_PRESETS = Object.freeze({
  standard: Object.freeze({
    spoolDiameter: 200,
    spoolBoreDiameter: 60,
    spoolWidth: 80,
  }),
  wide: Object.freeze({
    spoolDiameter: 220,
    spoolBoreDiameter: 60,
    spoolWidth: 115,
  }),
  large: Object.freeze({
    spoolDiameter: 250,
    spoolBoreDiameter: 60,
    spoolWidth: 140,
  }),
});

export const PARTS = Object.freeze([
  Object.freeze({ id: "side_frame", label: "Side frame" }),
  Object.freeze({ id: "crossbar", label: "Crossrail" }),
  Object.freeze({ id: "axle", label: "Axle" }),
  Object.freeze({ id: "axle_cap", label: "Axle cap" }),
  Object.freeze({ id: "link_clip", label: "Modular link clip" }),
  Object.freeze({ id: "nut_fit_test", label: "Nut-fit test" }),
]);

const numericRanges = Object.freeze({
  spoolDiameter: [120, 300],
  spoolBoreDiameter: [20, 120],
  spoolWidth: [30, 240],
  sideClearance: [1, 20],
  holderCount: [1, 4],
  printBed: [120, 500],
  baseDepth: [100, 300],
  floorClearance: [2, 40],
  railClearance: [2, 40],
  axleDiameter: [10, 30],
  railFitClearance: [0.05, 0.8],
  nutAcrossFlats: [5, 7],
  nutThickness: [1.8, 3.5],
  nutClearance: [0.05, 0.8],
  screwHoleDiameter: [3, 4.2],
  capFitClearance: [0, 0.8],
  linkGap: [20, 80],
  linkFitClearance: [0, 0.8],
});

const queryKeys = Object.freeze({
  d: "spoolDiameter",
  spoolBore: "spoolBoreDiameter",
  sw: "spoolWidth",
  side: "sideClearance",
  n: "holderCount",
  fit: "fitPreset",
  bed: "printBed",
  autoDepth: "autoBaseDepth",
  depth: "baseDepth",
  floorGap: "floorClearance",
  railGap: "railClearance",
  axle: "axleDiameter",
  nutAf: "nutAcrossFlats",
  nutT: "nutThickness",
  nutFit: "nutClearance",
  bore: "screwHoleDiameter",
  railFit: "railFitClearance",
  capFit: "capFitClearance",
  linkGap: "linkGap",
  linkFit: "linkFitClearance",
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeState(input = {}) {
  const normalized = { ...DEFAULTS, ...input };

  for (const [key, [min, max]] of Object.entries(numericRanges)) {
    normalized[key] = clamp(
      numberOr(normalized[key], DEFAULTS[key]),
      min,
      max,
    );
  }

  normalized.holderCount = Math.round(normalized.holderCount);
  normalized.autoBaseDepth =
    normalized.autoBaseDepth === true ||
    normalized.autoBaseDepth === "true" ||
    normalized.autoBaseDepth === "1";

  if (!["tight", "standard", "loose", "custom"].includes(normalized.fitPreset)) {
    normalized.fitPreset = DEFAULTS.fitPreset;
  }

  return normalized;
}

export function applyFitPreset(state, presetName) {
  const preset = FIT_PRESETS[presetName];
  if (!preset) {
    return normalizeState({ ...state, fitPreset: "custom" });
  }

  return normalizeState({
    ...state,
    ...preset,
    fitPreset: presetName,
  });
}

export function deriveDimensions(input) {
  const state = normalizeState(input);
  const baseDepth = state.autoBaseDepth
    ? Math.round(Math.max(140, state.spoolDiameter * 0.8) / 5) * 5
    : state.baseDepth;
  const insideWidth =
    state.spoolWidth + 2 * state.sideClearance;
  const spoolRadius = state.spoolDiameter / 2;
  const spoolCenterDrop =
    (state.spoolBoreDiameter - state.axleDiameter) / 2;
  const railCenterOffset =
    baseDepth / 2 - state.railInset;
  const railTop =
    state.railCenterHeight + state.railHeight / 2;
  const floorLimitedSpoolCenterHeight =
    spoolRadius + state.floorClearance;
  const railLimitedSpoolCenterHeight =
    railTop + spoolRadius + state.railClearance;
  const spoolCenterHeight = Math.max(
    floorLimitedSpoolCenterHeight,
    railLimitedSpoolCenterHeight,
  );
  const axleHeight = spoolCenterHeight + spoolCenterDrop;
  const actualFloorClearance =
    spoolCenterHeight - spoolRadius;
  const actualRailVerticalClearance =
    spoolCenterHeight - spoolRadius - railTop;
  const axleSlotRadius =
    state.axleDiameter / 2 + state.axleSlotClearance;
  const holderHeight = axleHeight + axleSlotRadius + 7;
  const frameOuterWidth =
    insideWidth + 2 * state.frameThickness;
  const axleLength =
    frameOuterWidth + 2 * state.axleOverhang;
  const axleCapDiameter =
    Math.max(27, state.axleDiameter + 9);
  const railLength =
    insideWidth + 2 * state.railTenonDepth;
  const minimumLinkGap =
    2 * (state.axleOverhang + state.capEndThickness) + 4;
  const linkedSpan =
    state.holderCount * frameOuterWidth +
    (state.holderCount - 1) * state.linkGap;
  const fitsBed =
    baseDepth <= state.printBed && holderHeight <= state.printBed;

  return {
    ...state,
    baseDepth,
    insideWidth,
    spoolRadius,
    spoolCenterDrop,
    spoolCenterHeight,
    railCenterOffset,
    railTop,
    floorLimitedSpoolCenterHeight,
    railLimitedSpoolCenterHeight,
    actualFloorClearance,
    actualRailVerticalClearance,
    limitingConstraint:
      railLimitedSpoolCenterHeight >
      floorLimitedSpoolCenterHeight
        ? "crossrails"
        : "floor",
    axleHeight,
    holderHeight,
    frameOuterWidth,
    axleLength,
    axleCapDiameter,
    railLength,
    minimumLinkGap,
    linkedSpan,
    fitsBed,
  };
}

export function validateState(input) {
  const dimensions = deriveDimensions(input);
  const errors = [];
  const warnings = [];

  if (dimensions.insideWidth <= dimensions.axleDiameter + 8) {
    errors.push("Clear width is too small for the selected axle.");
  }

  if (
    dimensions.railCenterOffset -
      dimensions.railDepth / 2 <=
    0
  ) {
    errors.push(
      "Footprint depth is too small to place the crossrails outside the spool centerline.",
    );
  }

  if (dimensions.spoolBoreDiameter <= dimensions.axleDiameter) {
    errors.push(
      "Maximum spool bore must be larger than the axle diameter.",
    );
  }

  if (dimensions.spoolBoreDiameter >= dimensions.spoolDiameter - 8) {
    errors.push(
      "Maximum spool bore must leave at least 4 mm of flange per side.",
    );
  }

  if (dimensions.nutThickness + 2 * dimensions.nutClearance >= 3.5) {
    errors.push(
      "Nut thickness plus clearance is too large for the 4 mm rail tenon.",
    );
  }

  if (
    dimensions.actualFloorClearance <
    dimensions.floorClearance - 0.001
  ) {
    errors.push("The spool envelope intersects the table keepout.");
  }

  if (
    dimensions.actualRailVerticalClearance <
    dimensions.railClearance - 0.001
  ) {
    errors.push(
      "The spool envelope intersects the crossrail top-plane keepout.",
    );
  }

  if (
    dimensions.holderCount > 1 &&
    dimensions.linkGap < dimensions.minimumLinkGap
  ) {
    errors.push(
      `Linked holders need at least ${dimensions.minimumLinkGap.toFixed(0)} mm between frames for the axle caps.`,
    );
  }

  if (!dimensions.fitsBed) {
    warnings.push(
      `The ${dimensions.baseDepth.toFixed(0)} × ${dimensions.holderHeight.toFixed(0)} mm side frame exceeds the selected ${dimensions.printBed.toFixed(0)} mm bed side.`,
    );
  }

  if (dimensions.spoolDiameter > 250 && dimensions.frameWeb < 16) {
    warnings.push(
      "Spools above 250 mm benefit from a thicker structural web.",
    );
  }

  return { dimensions, errors, warnings };
}

export function quantitiesFor(holderCount) {
  const count = clamp(Math.round(numberOr(holderCount, 1)), 1, 4);
  return [
    { id: "side_frame", label: "Side frame", quantity: 2 * count },
    { id: "crossbar", label: "Crossrail", quantity: 2 * count },
    { id: "axle", label: "Axle", quantity: count },
    { id: "axle_cap", label: "Axle cap", quantity: 2 * count },
    {
      id: "link_clip",
      label: "Modular link clip",
      quantity: 2 * Math.max(0, count - 1),
    },
    { id: "m3_nut", label: "M3 hex nut", quantity: 4 * count },
    {
      id: "m3_screw",
      label: "M3 × 10 mm socket screw",
      quantity: 4 * count,
    },
  ];
}

export function geometrySlug(input) {
  const dimensions = deriveDimensions(input);
  return [
    `${dimensions.spoolDiameter}d`,
    `${dimensions.spoolBoreDiameter}b`,
    `${dimensions.spoolWidth}sw`,
    `${dimensions.baseDepth}base`,
    `${dimensions.railClearance}gap`,
  ].join("-");
}

export function printGroupFor(groupId, holderCount) {
  const count = clamp(Math.round(numberOr(holderCount, 1)), 1, 4);
  const catalog = Object.fromEntries(
    quantitiesFor(count).map((item) => [item.id, item]),
  );

  if (groupId === "fit_check") {
    return {
      id: groupId,
      label: "Fit test",
      items: [
        { id: "nut_fit_test", label: "Nut-fit test", quantity: 1 },
        { id: "m3_nut", label: "M3 hex nut", quantity: 1 },
        {
          id: "m3_screw",
          label: "M3 × 10 mm socket screw",
          quantity: 1,
        },
      ],
    };
  }

  if (groupId === "holder_module") {
    const oneHolder = Object.fromEntries(
      quantitiesFor(1).map((item) => [item.id, item]),
    );
    return {
      id: groupId,
      label: "One holder module",
      items: [
        oneHolder.side_frame,
        oneHolder.crossbar,
        oneHolder.axle,
        oneHolder.axle_cap,
        oneHolder.m3_nut,
        oneHolder.m3_screw,
      ],
    };
  }

  if (groupId === "link_kit") {
    return {
      id: groupId,
      label: "Link clips",
      items: count > 1 ? [catalog.link_clip] : [],
    };
  }

  if (groupId === "complete") {
    return {
      id: groupId,
      label: "Complete print pack",
      items: [
        { id: "nut_fit_test", label: "Nut-fit test", quantity: 1 },
        ...quantitiesFor(count).filter(({ quantity }) => quantity > 0),
      ],
    };
  }

  throw new Error(`Unknown print group: ${groupId}`);
}

export function openScadDefinitions(input, part) {
  const dimensions = deriveDimensions(input);
  const allowedParts = new Set([
    ...PARTS.map(({ id }) => id),
    "assembly",
    "linked_assembly",
  ]);

  if (!allowedParts.has(part)) {
    throw new Error(`Unknown part: ${part}`);
  }

  return {
    part,
    show_preview_spool:
      part === "assembly" || part === "linked_assembly",
    holder_count: Math.max(2, dimensions.holderCount),
    spool_max_diameter: dimensions.spoolDiameter,
    spool_max_bore_diameter: dimensions.spoolBoreDiameter,
    spool_max_width: dimensions.spoolWidth,
    spool_side_clearance: dimensions.sideClearance,
    base_depth: dimensions.baseDepth,
    spool_floor_clearance: dimensions.floorClearance,
    spool_rail_clearance: dimensions.railClearance,
    rail_depth: dimensions.railDepth,
    rail_height: dimensions.railHeight,
    rail_inset: dimensions.railInset,
    rail_center_height: dimensions.railCenterHeight,
    axle_diameter: dimensions.axleDiameter,
    axle_cap_diameter: dimensions.axleCapDiameter,
    rail_fit_clearance: dimensions.railFitClearance,
    axle_cap_fit_clearance: dimensions.capFitClearance,
    m3_hole_diameter: dimensions.screwHoleDiameter,
    m3_nut_across_flats: dimensions.nutAcrossFlats,
    m3_nut_thickness: dimensions.nutThickness,
    m3_nut_clearance: dimensions.nutClearance,
    link_gap: dimensions.linkGap,
    link_fit_clearance: dimensions.linkFitClearance,
  };
}

export function stateFromQuery(search) {
  const params = new URLSearchParams(search);
  const state = {};

  for (const [queryKey, stateKey] of Object.entries(queryKeys)) {
    if (!params.has(queryKey)) {
      continue;
    }
    const raw = params.get(queryKey);
    state[stateKey] =
      stateKey === "fitPreset"
        ? raw
        : stateKey === "autoBaseDepth"
          ? raw !== "0"
          : Number(raw);
  }

  return normalizeState(state);
}

export function queryFromState(input) {
  const state = normalizeState(input);
  const params = new URLSearchParams();

  for (const [queryKey, stateKey] of Object.entries(queryKeys)) {
    const value = state[stateKey];
    if (value === DEFAULTS[stateKey]) {
      continue;
    }
    params.set(
      queryKey,
      typeof value === "boolean" ? (value ? "1" : "0") : String(value),
    );
  }

  return params.toString();
}
