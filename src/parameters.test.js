import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  applyFitPreset,
  deriveDimensions,
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
    expect(dimensions.holderHeight).toBeCloseTo(138.35);
    expect(dimensions.axleLength).toBe(163);
    expect(dimensions.fitsBed).toBe(true);
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
  it("maps public settings to OpenSCAD definitions", () => {
    const definitions = openScadDefinitions(
      { ...DEFAULTS, spoolDiameter: 205, nutAcrossFlats: 5.65 },
      "side_frame",
    );
    expect(definitions.part).toBe("side_frame");
    expect(definitions.spool_max_diameter).toBe(205);
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
      holderCount: 3,
      nutClearance: 0.35,
    });
    const restored = stateFromQuery(query);
    expect(restored.spoolDiameter).toBe(240);
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
});
