import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  applyFitPreset,
  deriveDimensions,
  geometrySlug,
  openScadDefinitions,
  printGroupFor,
  quantitiesFor,
  queryFromState,
  stateFromQuery,
  validateState,
} from "./parameters.js";

describe("deriveDimensions", () => {
  it("derives height and default 220 mm bed footprint", () => {
    const dimensions = deriveDimensions(DEFAULTS);

    expect(dimensions.baseDepth).toBe(175);
    expect(dimensions.spoolCenterDrop).toBe(21);
    expect(dimensions.axleHeight).toBe(143);
    expect(dimensions.holderHeight).toBeCloseTo(159.35);
    expect(dimensions.axleLength).toBe(163);
    expect(dimensions.fitsBed).toBe(true);
  });

  it("gives an exact 200 × 54 mm spool 12 mm of floor clearance", () => {
    const dimensions = deriveDimensions({
      ...DEFAULTS,
      spoolDiameter: 200,
      spoolBoreDiameter: 54,
    });
    const supportedSpoolBottom =
      dimensions.axleHeight -
      dimensions.spoolCenterDrop -
      dimensions.spoolDiameter / 2;

    expect(dimensions.spoolCenterDrop).toBe(18);
    expect(dimensions.axleHeight).toBe(130);
    expect(supportedSpoolBottom).toBe(12);
  });

  it("supports a 200 × 54 mm spool in the default envelope", () => {
    const dimensions = deriveDimensions(DEFAULTS);
    const actualSpoolBottom =
      dimensions.axleHeight -
      (54 - dimensions.axleDiameter) / 2 -
      200 / 2;

    expect(actualSpoolBottom).toBe(25);
  });

  it("derives a repeatable multi-holder span", () => {
    const dimensions = deriveDimensions({
      ...DEFAULTS,
      holderCount: 3,
    });

    expect(dimensions.linkedSpan).toBe(
      3 * dimensions.frameOuterWidth + 2 * dimensions.linkGap,
    );
  });
});

describe("fit and quantities", () => {
  it("applies the loose fit preset", () => {
    const state = applyFitPreset(DEFAULTS, "loose");
    expect(state.nutClearance).toBe(0.4);
    expect(state.screwHoleDiameter).toBe(3.6);
  });

  it("counts parts for two linked holders", () => {
    const quantities = Object.fromEntries(
      quantitiesFor(2).map(({ id, quantity }) => [id, quantity]),
    );
    expect(quantities.side_frame).toBe(4);
    expect(quantities.link_clip).toBe(2);
    expect(quantities.m3_nut).toBe(8);
  });

  it("builds practical print groups with exact quantities", () => {
    const oneHolder = Object.fromEntries(
      printGroupFor("holder_module", 4).items.map(({ id, quantity }) => [
        id,
        quantity,
      ]),
    );
    const linkKit = printGroupFor("link_kit", 3);
    const complete = Object.fromEntries(
      printGroupFor("complete", 2).items.map(({ id, quantity }) => [
        id,
        quantity,
      ]),
    );

    expect(oneHolder.side_frame).toBe(2);
    expect(oneHolder.m3_screw).toBe(4);
    expect(linkKit.items[0].quantity).toBe(4);
    expect(complete.nut_fit_test).toBe(1);
    expect(complete.side_frame).toBe(4);
  });
});

describe("OpenSCAD and URL serialization", () => {
  it("includes spool bore in generated geometry identity", () => {
    expect(geometrySlug(DEFAULTS)).toBe("220d-60b-125w");
  });

  it("maps public settings to OpenSCAD definitions", () => {
    const definitions = openScadDefinitions(
      { ...DEFAULTS, spoolDiameter: 205, nutAcrossFlats: 5.65 },
      "side_frame",
    );
    expect(definitions.part).toBe("side_frame");
    expect(definitions.spool_max_diameter).toBe(205);
    expect(definitions.spool_max_bore_diameter).toBe(60);
    expect(definitions.m3_nut_across_flats).toBe(5.65);
    expect(definitions.holder_count).toBe(2);
    expect(definitions.show_preview_spool).toBe(false);
  });

  it("passes the configured module count to linked previews", () => {
    const definitions = openScadDefinitions(
      { ...DEFAULTS, holderCount: 4 },
      "linked_assembly",
    );
    expect(definitions.holder_count).toBe(4);
    expect(definitions.show_preview_spool).toBe(true);
  });

  it("keeps the axle cap safely larger than a custom axle", () => {
    const definitions = openScadDefinitions(
      { ...DEFAULTS, axleDiameter: 30 },
      "axle_cap",
    );
    expect(definitions.axle_cap_diameter).toBe(39);
  });

  it("round-trips non-default URL settings", () => {
    const query = queryFromState({
      ...DEFAULTS,
      spoolDiameter: 240,
      spoolBoreDiameter: 70,
      holderCount: 3,
      nutClearance: 0.35,
    });
    const restored = stateFromQuery(query);
    expect(restored.spoolDiameter).toBe(240);
    expect(restored.spoolBoreDiameter).toBe(70);
    expect(restored.holderCount).toBe(3);
    expect(restored.nutClearance).toBe(0.35);
  });

  it("rejects an unsafe linked gap", () => {
    const result = validateState({
      ...DEFAULTS,
      holderCount: 2,
      linkGap: 20,
    });
    expect(result.errors.join(" ")).toContain("at least");
  });

  it("rejects a spool bore that cannot rotate around the axle", () => {
    const result = validateState({
      ...DEFAULTS,
      spoolBoreDiameter: 20,
      axleDiameter: 20,
    });
    expect(result.errors.join(" ")).toContain("larger than the axle");
  });
});
