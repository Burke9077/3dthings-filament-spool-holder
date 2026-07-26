import scadSource from "../filament_spool_holder.scad?raw";
import licenseText from "../LICENSE?raw";
import {
  DEFAULTS,
  PARTS,
  SIZE_PRESETS,
  applyFitPreset,
  normalizeState,
  openScadDefinitions,
  printGroupFor,
  quantitiesFor,
  queryFromState,
  stateFromQuery,
  validateState,
} from "./parameters.js";
import "./styles.css";

const form = document.querySelector("#customizer-form");
const viewerElement = document.querySelector("#viewer");
const previewStatusText = document.querySelector("#preview-status-text");
const validationElement = document.querySelector("#validation");
const partSelect = document.querySelector("#part-select");
const downloadPartButton = document.querySelector("#download-part-button");
const bundleButtons = [
  ...document.querySelectorAll("[data-bundle]"),
];
const linkKitButton = document.querySelector("#link-kit-button");
const cancelButton = document.querySelector("#cancel-button");
const statusElement = document.querySelector("#generation-status");
const progressBar = document.querySelector("#progress-bar");
const fitPresetSelect = document.querySelector("#fit-preset");
const fitPresetSummary = document.querySelector("#fit-preset-summary");
const resetButton = document.querySelector("#reset-button");
const copyLinkButton = document.querySelector("#copy-link-button");
const bomBody = document.querySelector("#bom-body");
const summaryTitle = document.querySelector("#summary-title");
const linkKitDescription = document.querySelector("#link-kit-description");
const completePackTitle = document.querySelector("#complete-pack-title");
const completePackDescription = document.querySelector(
  "#complete-pack-description",
);

const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
const moduleUrl = new URL(
  "vendor/openscad/openscad.js",
  baseUrl,
).href;
const wasmUrl = new URL(
  "vendor/openscad/openscad.wasm",
  baseUrl,
).href;

const previewDebounceMilliseconds = 500;
const fitPresetSummaries = Object.freeze({
  standard: "Balanced mating clearances for most tuned FDM printers.",
  loose:
    "Extra clearance enlarges pockets, bores, and sockets when printed parts bind or press fits are too tight.",
  tight:
    "Reduced clearance tightens mating parts when joints, caps, or clips feel loose.",
  custom:
    "Custom uses the individual clearance values under Advanced dimensions and fit.",
});

let viewerPromise = null;
let state = stateFromQuery(window.location.search);
let activeWorker = null;
let activeCancel = null;
let activeOperation = null;
let exportBusy = false;
let hasValidationErrors = false;
let previewTimer = null;
let previewRequest = 0;
let lastPreviewKey = null;
let lastPreviewState = null;
let generationId = 0;
let cancelled = false;

function setFormState(nextState, { previewImmediately = false } = {}) {
  const normalized = normalizeState(nextState);
  const elements = form.elements;

  for (const [name, value] of Object.entries(normalized)) {
    const element = elements.namedItem(name);
    if (!element) {
      continue;
    }
    if (element instanceof RadioNodeList) {
      element.value = String(value);
    } else if (element.type === "checkbox") {
      element.checked = Boolean(value);
    } else {
      element.value = String(value);
    }
  }

  state = normalized;
  render();
  schedulePreview({ immediate: previewImmediately });
}

function readFormState() {
  const data = new FormData(form);
  const next = { ...state };

  for (const key of Object.keys(DEFAULTS)) {
    if (key === "autoBaseDepth") {
      next[key] = form.elements.namedItem(key).checked;
      continue;
    }
    if (!data.has(key)) {
      continue;
    }
    next[key] =
      typeof DEFAULTS[key] === "number"
        ? Number(data.get(key))
        : data.get(key);
  }

  return normalizeState(next);
}

function formatMillimeters(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString()} mm`;
}

function renderValidation(errors, warnings) {
  validationElement.replaceChildren();
  for (const message of errors) {
    const item = document.createElement("p");
    item.className = "validation-error";
    item.textContent = message;
    validationElement.append(item);
  }
  for (const message of warnings) {
    const item = document.createElement("p");
    item.className = "validation-warning";
    item.textContent = message;
    validationElement.append(item);
  }
}

function renderBom() {
  bomBody.replaceChildren();
  for (const item of quantitiesFor(state.holderCount)) {
    if (item.quantity === 0) {
      continue;
    }
    const row = document.createElement("tr");
    const label = document.createElement("td");
    const quantity = document.createElement("td");
    label.textContent = item.label;
    quantity.textContent = String(item.quantity);
    row.append(label, quantity);
    bomBody.append(row);
  }
}

function render() {
  const { dimensions, errors, warnings } = validateState(state);
  state = normalizeState(state);

  document.querySelector("#spool-diameter-output").textContent =
    formatMillimeters(dimensions.spoolDiameter);
  document.querySelector("#inside-width-output").textContent =
    formatMillimeters(dimensions.insideWidth);
  document.querySelector("#frame-print-size").textContent =
    `${Math.round(dimensions.baseDepth)} × ${Math.round(dimensions.holderHeight)} mm`;
  document.querySelector("#holder-height").textContent =
    formatMillimeters(dimensions.holderHeight);
  document.querySelector("#axle-length").textContent =
    formatMillimeters(dimensions.axleLength);
  document.querySelector("#linked-span").textContent =
    dimensions.holderCount === 1
      ? "Single module"
      : formatMillimeters(dimensions.linkedSpan);

  const depthInput = form.elements.namedItem("baseDepth");
  depthInput.disabled = state.autoBaseDepth;
  if (state.autoBaseDepth) {
    depthInput.value = String(dimensions.baseDepth);
  }

  const titleWords = [
    "",
    "One holder",
    "Two linked holders",
    "Three linked holders",
    "Four linked holders",
  ];
  summaryTitle.textContent = titleWords[state.holderCount];
  completePackTitle.textContent = titleWords[state.holderCount];
  const linkCount = 2 * Math.max(0, state.holderCount - 1);
  linkKitDescription.textContent =
    state.holderCount === 1
      ? "Add another holder to enable"
      : `${linkCount} clips for ${state.holderCount} holders`;
  completePackDescription.textContent =
    `One ZIP with every customized STL and exact print quantities for ${state.holderCount} holder${state.holderCount === 1 ? "" : "s"}.`;
  fitPresetSummary.textContent =
    fitPresetSummaries[state.fitPreset] ?? fitPresetSummaries.standard;

  renderValidation(errors, warnings);
  renderBom();

  hasValidationErrors = errors.length > 0;
  syncActionState();
  linkKitButton.setAttribute(
    "aria-label",
    state.holderCount === 1
      ? "Link clips unavailable for one holder"
      : `Download ${linkCount} link clips as a ZIP`,
  );

  const linkOption = partSelect.querySelector('option[value="link_clip"]');
  linkOption.disabled = state.holderCount === 1;
  if (linkOption.disabled && partSelect.value === "link_clip") {
    partSelect.value = "side_frame";
  }

  const query = queryFromState(state);
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  history.replaceState(null, "", url);
}

function syncActionState() {
  const isBusy = exportBusy || activeWorker !== null;
  cancelButton.classList.toggle("hidden", !exportBusy);
  downloadPartButton.disabled = hasValidationErrors || isBusy;
  for (const button of bundleButtons) {
    button.disabled =
      hasValidationErrors ||
      isBusy ||
      (button.dataset.bundle === "link_kit" && state.holderCount === 1);
  }
  form.inert = exportBusy;
  form.classList.toggle("is-busy", exportBusy);
  form.setAttribute("aria-busy", String(exportBusy));
}

function setExportBusy(isBusy) {
  exportBusy = isBusy;
  syncActionState();
}

function setProgress(fraction) {
  progressBar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
}

function setPreviewStatus(previewState, message) {
  viewerElement.dataset.previewState = previewState;
  viewerElement.setAttribute(
    "aria-busy",
    String(previewState === "queued" || previewState === "loading"),
  );
  previewStatusText.textContent = message;
}

function previewSpecification(inputState) {
  const part =
    inputState.holderCount > 1 ? "linked_assembly" : "assembly";
  const definitions = openScadDefinitions(inputState, part);
  return {
    part,
    definitions,
    key: JSON.stringify([part, definitions]),
  };
}

function previewReadyMessage(inputState) {
  return inputState.holderCount === 1
    ? "Live preview · one holder"
    : `Live preview · ${inputState.holderCount} linked holders`;
}

function schedulePreview({ immediate = false, force = false } = {}) {
  clearTimeout(previewTimer);
  const request = ++previewRequest;

  if (activeOperation === "preview") {
    activeCancel?.();
  }

  const { errors } = validateState(state);
  if (errors.length > 0) {
    setPreviewStatus(
      "invalid",
      "Fix the highlighted settings to update the preview.",
    );
    return;
  }

  const specification = previewSpecification(state);
  if (
    !force &&
    lastPreviewKey === specification.key &&
    viewerElement.classList.contains("has-model")
  ) {
    setPreviewStatus("ready", previewReadyMessage(state));
    return;
  }

  setPreviewStatus(
    "queued",
    viewerElement.classList.contains("has-model")
      ? "Changes detected · updating preview…"
      : "Preparing live preview…",
  );
  previewTimer = setTimeout(
    () => buildPreview(request),
    immediate ? 0 : previewDebounceMilliseconds,
  );
}

function runOpenScad(
  part,
  progressMessage,
  {
    renderState = state,
    operation = "export",
    definitions = openScadDefinitions(renderState, part),
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (activeWorker !== null) {
      reject(new Error("OpenSCAD is already generating another model."));
      return;
    }

    const id = ++generationId;
    const worker = new Worker(
      new URL("./openscad.worker.js", import.meta.url),
      { type: "module" },
    );
    activeWorker = worker;
    activeOperation = operation;
    syncActionState();

    const reportStatus = (message) => {
      if (operation === "preview") {
        setPreviewStatus("loading", message);
      } else {
        statusElement.textContent = message;
      }
    };
    const cleanup = () => {
      worker.terminate();
      if (activeWorker === worker) {
        activeWorker = null;
        activeCancel = null;
        activeOperation = null;
        syncActionState();
      }
    };

    activeCancel = () => {
      cleanup();
      reject(new DOMException("Generation cancelled.", "AbortError"));
    };
    reportStatus(progressMessage);

    worker.addEventListener("message", (event) => {
      if (event.data.id !== id) {
        return;
      }
      if (event.data.type === "status") {
        reportStatus(event.data.message);
      } else if (event.data.type === "result") {
        cleanup();
        resolve(event.data.buffer);
      } else if (event.data.type === "error") {
        cleanup();
        const details = event.data.stderr?.slice(-5).join(" ") ?? "";
        reject(new Error(`${event.data.message} ${details}`.trim()));
      }
    });

    worker.addEventListener("error", (event) => {
      cleanup();
      reject(new Error(event.message || "OpenSCAD worker failed."));
    });

    worker.postMessage({
      id,
      moduleUrl,
      wasmUrl,
      source: scadSource,
      definitions,
    });
  });
}

function saveBlob(blob, filename) {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function partFilename(part, quantity) {
  const quantitySuffix = quantity ? `-print-${quantity}` : "";
  return `spool-holder-${state.spoolDiameter}d-${state.insideWidth}w-${part.replaceAll("_", "-")}${quantitySuffix}.stl`;
}

async function showInViewer(buffer) {
  viewerPromise ??= import("./viewer.js").then(
    ({ StlViewer }) => new StlViewer(viewerElement),
  );
  const viewer = await viewerPromise;
  viewer.load(buffer);
  viewerElement.classList.add("has-model");
}

async function buildPreview(request) {
  if (request !== previewRequest) {
    return;
  }

  if (exportBusy || activeWorker !== null) {
    previewTimer = setTimeout(() => buildPreview(request), 200);
    return;
  }

  const renderState = { ...state };
  const specification = previewSpecification(renderState);
  setPreviewStatus(
    "loading",
    viewerElement.classList.contains("has-model")
      ? "Updating configured model…"
      : "Building configured model…",
  );

  try {
    const buffer = await runOpenScad(
      specification.part,
      "Loading OpenSCAD for the live preview…",
      {
        renderState,
        operation: "preview",
        definitions: specification.definitions,
      },
    );
    if (request !== previewRequest) {
      return;
    }
    await showInViewer(buffer);
    if (request !== previewRequest) {
      return;
    }
    lastPreviewKey = specification.key;
    lastPreviewState = renderState;
    setPreviewStatus("ready", previewReadyMessage(renderState));
  } catch (error) {
    if (request !== previewRequest || error.name === "AbortError") {
      return;
    }
    setPreviewStatus("error", `Preview failed: ${error.message}`);
  }
}

function beginExport() {
  clearTimeout(previewTimer);
  previewRequest += 1;
  if (activeOperation === "preview") {
    activeCancel?.();
  }
  cancelled = false;
  setExportBusy(true);
}

function finishExport() {
  if (cancelled) {
    statusElement.textContent = "Generation cancelled.";
  }
  setExportBusy(false);
  schedulePreview({ immediate: true });
}

async function downloadPart() {
  const part = partSelect.value;
  const renderState = { ...state };
  beginExport();
  setProgress(0.15);

  try {
    const buffer = await runOpenScad(
      part,
      `Generating ${PARTS.find((item) => item.id === part)?.label ?? part}…`,
      { renderState, operation: "export" },
    );
    if (cancelled) {
      return;
    }
    setProgress(1);
    saveBlob(
      new Blob([buffer], { type: "model/stl" }),
      partFilename(part),
    );
    statusElement.textContent = "STL downloaded.";
  } catch (error) {
    if (!cancelled) {
      statusElement.textContent = `Generation failed: ${error.message}`;
    }
  } finally {
    finishExport();
    setTimeout(() => setProgress(0), 800);
  }
}

function printPackManifest(group) {
  const { dimensions } = validateState(state);
  const quantities = group.items
    .filter(({ quantity }) => quantity > 0)
    .map(({ label, quantity }) => `${String(quantity).padStart(2)}  ${label}`)
    .join("\n");

  return `PARAMETRIC FILAMENT SPOOL HOLDER
PRINT GROUP: ${group.label.toUpperCase()}

Generated in-browser from:
https://github.com/Burke9077/3dthings-filament-spool-holder

PRINT / HARDWARE QUANTITIES
${quantities}

KEY DIMENSIONS
Maximum spool diameter: ${dimensions.spoolDiameter} mm
Clear width:            ${dimensions.insideWidth} mm
Footprint depth:        ${dimensions.baseDepth} mm
Holder height:          ${dimensions.holderHeight.toFixed(2)} mm
Axle length:            ${dimensions.axleLength.toFixed(2)} mm
Linked frame gap:       ${dimensions.linkGap} mm

Print the nut-fit test before the structural parts.
Recommended starting point: 0.20 mm layers, 25% infill, and no supports.
`;
}

async function downloadBundle(groupId) {
  const renderState = { ...state };
  const group = printGroupFor(groupId, state.holderCount);
  const printablePartIds = new Set(PARTS.map(({ id }) => id));
  const partIds = [
    ...new Set(
      group.items
        .filter(({ id, quantity }) => quantity > 0 && printablePartIds.has(id))
        .map(({ id }) => id),
    ),
  ];

  if (partIds.length === 0) {
    statusElement.textContent = "This configuration does not need link clips.";
    return;
  }

  beginExport();

  try {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (let index = 0; index < partIds.length; index += 1) {
      if (cancelled) {
        return;
      }
      const part = partIds[index];
      setProgress(index / partIds.length);
      const buffer = await runOpenScad(
        part,
        `Generating ${index + 1} of ${partIds.length}: ${part.replaceAll("_", " ")}…`,
        { renderState, operation: "export" },
      );
      const quantity =
        group.items.find((item) => item.id === part)?.quantity ?? 1;
      zip.file(partFilename(part, quantity), buffer);
    }

    zip.file("PRINT-ME.txt", printPackManifest(group));
    zip.file("settings.json", JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        printGroup: group,
        state,
        definitions: openScadDefinitions(state, "assembly"),
      },
      null,
      2,
    ));
    zip.file("filament_spool_holder.scad", scadSource);
    zip.file("LICENSE", licenseText);
    statusElement.textContent = "Compressing print pack…";
    setProgress(0.95);
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    if (cancelled) {
      return;
    }
    saveBlob(
      blob,
      [
        "spool-holder",
        `${state.spoolDiameter}d`,
        `${state.insideWidth}w`,
        `${state.holderCount}x`,
        group.id.replaceAll("_", "-"),
      ].join("-") + ".zip",
    );
    setProgress(1);
    statusElement.textContent = `${group.label} downloaded.`;
  } catch (error) {
    if (!cancelled) {
      statusElement.textContent = `Generation failed: ${error.message}`;
    }
  } finally {
    finishExport();
    setTimeout(() => setProgress(0), 800);
  }
}

form.addEventListener("input", (event) => {
  state = readFormState();
  if (
    event.target.name !== "fitPreset" &&
    [
      "railFitClearance",
      "nutClearance",
      "screwHoleDiameter",
      "capFitClearance",
      "linkFitClearance",
    ].includes(event.target.name)
  ) {
    state.fitPreset = "custom";
    fitPresetSelect.value = "custom";
  }
  render();
  schedulePreview();
});

fitPresetSelect.addEventListener("change", () => {
  state = applyFitPreset(readFormState(), fitPresetSelect.value);
  setFormState(state);
});

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = SIZE_PRESETS[button.dataset.preset];
    setFormState({ ...state, ...preset });
  });
});

resetButton.addEventListener("click", () => setFormState(DEFAULTS));
downloadPartButton.addEventListener("click", downloadPart);
for (const button of bundleButtons) {
  button.addEventListener("click", () => downloadBundle(button.dataset.bundle));
}
cancelButton.addEventListener("click", () => {
  cancelled = true;
  activeCancel?.();
  statusElement.textContent = "Cancelling generation…";
  setProgress(0);
});

copyLinkButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyLinkButton.textContent = "Copied";
  } catch {
    copyLinkButton.textContent = "Copy failed";
  }
  setTimeout(() => {
    copyLinkButton.textContent = "Copy configuration link";
  }, 1600);
});

setFormState(state, { previewImmediately: true });

window.__spoolCustomizer = {
  getState: () => ({ ...state }),
  getPreviewState: () =>
    lastPreviewState ? { ...lastPreviewState } : null,
  async generateByteLength(part = "nut_fit_test") {
    const buffer = await runOpenScad(part, `Testing ${part}…`, {
      renderState: { ...state },
      operation: "test",
    });
    statusElement.textContent = "Browser generator verified.";
    return buffer.byteLength;
  },
};
