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
    expect(dimensions.insideWidth).toBe(125);
    expect(dimensions.spoolCenterDrop).toBe(21);
    expect(dimensions.axleHeight).toBe(172);
    expect(dimensions.holderHeight).toBeCloseTo(188.35);
    expect(dimensions.actualRailVerticalClearance).toBe(15);
    expect(dimensions.actualFloorClearance).toBe(41);
    expect(dimensions.limitingConstraint).toBe("crossrails");
    expect(dimensions.axleLength).toBe(163);
    expect(dimensions.fitsBed).toBe(true);
  });

  it("clears unchanged crossrails for an exact 200 × 54 mm spool", () => {
    const dimensions = deriveDimensions({
      ...DEFAULTS,
      spoolDiameter: 200,
      spoolBoreDiameter: 54,
      spoolWidth: 70,
    });

    expect(dimensions.spoolCenterDrop).toBe(18);
    expect(dimensions.baseDepth).toBe(160);
    expect(dimensions.axleHeight).toBe(159);
    expect(dimensions.actualRailVerticalClearance).toBe(15);
    expect(dimensions.actualFloorClearance).toBe(41);
  });

  it("records the failed wall's negative full-top-plane gap", () => {
    const printedAxleHeight = 143;
    const measuredSpoolDiameter = 200;
    const measuredSpoolBore = 54;
    const axleDiameter = 18;
    const railTop = 17 + 18 / 2;
    const measuredSpoolCenter =
      printedAxleHeight -
      (measuredSpoolBore - axleDiameter) / 2;
    const measuredSpoolBottom =
      measuredSpoolCenter - measuredSpoolDiameter / 2;

    expect(measuredSpoolCenter).toBe(125);
    expect(measuredSpoolBottom).toBe(25);
    expect(railTop).toBe(26);
    const topPlaneGap = measuredSpoolBottom - railTop;

    expect(topPlaneGap).toBe(-1);
  });

  it("supports a 200 × 54 mm spool with extra room in the default envelope", () => {
    const dimensions = deriveDimensions(DEFAULTS);
    const actualSpoolCenter =
      dimensions.axleHeight -
      (54 - dimensions.axleDiameter) / 2;
    const actualSpoolBottom = actualSpoolCenter - 100;
    const actualRailVerticalClearance =
      actualSpoolBottom - dimensions.railTop;

    expect(actualSpoolBottom).toBe(54);
    expect(actualRailVerticalClearance).toBe(28);
  });

  it("maintains requested clearances across the supported parameter range", () => {
    const configurations = [
      { spoolDiameter: 120, spoolBoreDiameter: 20, spoolWidth: 30 },
      { spoolDiameter: 200, spoolBoreDiameter: 54, spoolWidth: 70 },
      { spoolDiameter: 220, spoolBoreDiameter: 60, spoolWidth: 115 },
      { spoolDiameter: 250, spoolBoreDiameter: 80, spoolWidth: 140 },
      { spoolDiameter: 300, spoolBoreDiameter: 120, spoolWidth: 200 },
    ];

    for (const configuration of configurations) {
      const dimensions = deriveDimensions({
        ...DEFAULTS,
        ...configuration,
      });
      expect(dimensions.actualFloorClearance).toBeGreaterThanOrEqual(
        dimensions.floorClearance - 0.001,
      );
      expect(
        dimensions.actualRailVerticalClearance,
      ).toBeGreaterThanOrEqual(
        dimensions.railClearance - 0.001,
      );
      expect(dimensions.insideWidth).toBe(
        dimensions.spoolWidth + 2 * dimensions.sideClearance,
      );
    }
  });

  it("keeps every valid spool within the default maxima above the rails", () => {
    const dimensions = deriveDimensions(DEFAULTS);

    for (
      let spoolDiameter = 120;
      spoolDiameter <= dimensions.spoolDiameter;
      spoolDiameter += 5
    ) {
      for (
        let spoolBore = 20;
        spoolBore <= dimensions.spoolBoreDiameter;
        spoolBore += 2
      ) {
        if (
          spoolBore <= dimensions.axleDiameter ||
          spoolBore >= spoolDiameter - 8
        ) {
          continue;
        }

        const centerHeight =
          dimensions.axleHeight -
          (spoolBore - dimensions.axleDiameter) / 2;
        const bottomHeight =
          centerHeight - spoolDiameter / 2;

        expect(
          bottomHeight - dimensions.railTop,
        ).toBeGreaterThanOrEqual(dimensions.railClearance);
      }
    }
  });

  it("uses the stricter floor constraint when it exceeds the rail rule", () => {
    const dimensions = deriveDimensions({
      ...DEFAULTS,
      floorClearance: 40,
      railClearance: 2,
    });

    expect(dimensions.limitingConstraint).toBe("floor");
    expect(dimensions.actualFloorClearance).toBe(40);
    expect(dimensions.actualRailVerticalClearance).toBe(14);
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
    expect(geometrySlug(DEFAULTS)).toBe(
      "220d-60b-115sw-175base-15gap",
    );
  });

  it("maps public settings to OpenSCAD definitions", () => {
    const definitions = openScadDefinitions(
      { ...DEFAULTS, spoolDiameter: 205, nutAcrossFlats: 5.65 },
      "side_frame",
    );
    expect(definitions.part).toBe("side_frame");
    expect(definitions.spool_max_diameter).toBe(205);
    expect(definitions.spool_max_bore_diameter).toBe(60);
    expect(definitions.spool_max_width).toBe(115);
    expect(definitions.spool_side_clearance).toBe(5);
    expect(definitions.spool_rail_clearance).toBe(15);
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
      spoolWidth: 100,
      sideClearance: 7,
      floorClearance: 19,
      railClearance: 18,
      holderCount: 3,
      nutClearance: 0.35,
    });
    const restored = stateFromQuery(query);
    expect(restored.spoolDiameter).toBe(240);
    expect(restored.spoolBoreDiameter).toBe(70);
    expect(restored.spoolWidth).toBe(100);
    expect(restored.sideClearance).toBe(7);
    expect(restored.floorClearance).toBe(19);
    expect(restored.railClearance).toBe(18);
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
