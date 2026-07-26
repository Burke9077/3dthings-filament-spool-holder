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
const viewerPlaceholder = document.querySelector("#viewer-placeholder");
const validationElement = document.querySelector("#validation");
const partSelect = document.querySelector("#part-select");
const previewButton = document.querySelector("#preview-button");
const downloadPartButton = document.querySelector("#download-part-button");
const bundleButtons = [
  ...document.querySelectorAll("[data-bundle]"),
];
const linkKitButton = document.querySelector("#link-kit-button");
const cancelButton = document.querySelector("#cancel-button");
const statusElement = document.querySelector("#generation-status");
const progressBar = document.querySelector("#progress-bar");
const fitPresetSelect = document.querySelector("#fit-preset");
const resetButton = document.querySelector("#reset-button");
const copyLinkButton = document.querySelector("#copy-link-button");
const bomBody = document.querySelector("#bom-body");
const summaryTitle = document.querySelector("#summary-title");
const linkKitDescription = document.querySelector("#link-kit-description");
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

let viewerPromise = null;
let state = stateFromQuery(window.location.search);
let activeWorker = null;
let activeCancel = null;
let generationId = 0;
let cancelled = false;

function setFormState(nextState) {
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
  const linkCount = 2 * Math.max(0, state.holderCount - 1);
  linkKitDescription.textContent =
    state.holderCount === 1
      ? "Add another holder to enable"
      : `${linkCount} clips for ${state.holderCount} holders`;
  completePackDescription.textContent =
    `All parts for ${state.holderCount} holder${state.holderCount === 1 ? "" : "s"}`;

  renderValidation(errors, warnings);
  renderBom();

  const disabled = errors.length > 0 || activeWorker !== null;
  previewButton.disabled = disabled;
  downloadPartButton.disabled = disabled;
  for (const button of bundleButtons) {
    button.disabled =
      disabled ||
      (button.dataset.bundle === "link_kit" && state.holderCount === 1);
  }
  linkKitButton.setAttribute(
    "aria-label",
    state.holderCount === 1
      ? "Link kit unavailable for one holder"
      : `Generate ${linkCount}-clip link-kit ZIP`,
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

function setBusy(isBusy) {
  cancelButton.classList.toggle("hidden", !isBusy);
  previewButton.disabled = isBusy;
  downloadPartButton.disabled = isBusy;
  for (const button of bundleButtons) {
    button.disabled = isBusy;
  }
  form.classList.toggle("is-busy", isBusy);
  if (!isBusy) {
    render();
  }
}

function setProgress(fraction) {
  progressBar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
}

function runOpenScad(part, progressMessage) {
  return new Promise((resolve, reject) => {
    const id = ++generationId;
    const worker = new Worker(
      new URL("./openscad.worker.js", import.meta.url),
      { type: "module" },
    );
    activeWorker = worker;
    activeCancel = () => {
      worker.terminate();
      if (activeWorker === worker) {
        activeWorker = null;
      }
      activeCancel = null;
      reject(new Error("Generation cancelled."));
    };
    statusElement.textContent = progressMessage;

    worker.addEventListener("message", (event) => {
      if (event.data.id !== id) {
        return;
      }
      if (event.data.type === "status") {
        statusElement.textContent = event.data.message;
      } else if (event.data.type === "result") {
        worker.terminate();
        activeWorker = null;
        activeCancel = null;
        resolve(event.data.buffer);
      } else if (event.data.type === "error") {
        worker.terminate();
        activeWorker = null;
        activeCancel = null;
        const details = event.data.stderr?.slice(-5).join(" ") ?? "";
        reject(new Error(`${event.data.message} ${details}`.trim()));
      }
    });

    worker.addEventListener("error", (event) => {
      worker.terminate();
      activeWorker = null;
      activeCancel = null;
      reject(new Error(event.message || "OpenSCAD worker failed."));
    });

    worker.postMessage({
      id,
      moduleUrl,
      wasmUrl,
      source: scadSource,
      definitions: openScadDefinitions(state, part),
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

function partFilename(part) {
  return `spool-holder-${state.spoolDiameter}d-${state.insideWidth}w-${part.replaceAll("_", "-")}.stl`;
}

async function showInViewer(buffer) {
  viewerPromise ??= import("./viewer.js").then(
    ({ StlViewer }) => new StlViewer(viewerElement),
  );
  const viewer = await viewerPromise;
  viewer.load(buffer);
  viewerPlaceholder.classList.add("hidden");
}

async function buildPreview() {
  const previewPart =
    state.holderCount > 1 ? "linked_assembly" : "assembly";
  cancelled = false;
  setBusy(true);
  setProgress(0.15);

  try {
    const buffer = await runOpenScad(
      previewPart,
      "Building the actual OpenSCAD assembly…",
    );
    if (cancelled) {
      return;
    }
    setProgress(1);
    await showInViewer(buffer);
    statusElement.textContent =
      state.holderCount > 2
        ? "Preview shows one linked pair; the same connector repeats for additional holders."
        : "3D preview ready.";
  } catch (error) {
    if (!cancelled) {
      statusElement.textContent = `Generation failed: ${error.message}`;
    }
  } finally {
    setBusy(false);
    setTimeout(() => setProgress(0), 800);
  }
}

async function downloadPart() {
  const part = partSelect.value;
  cancelled = false;
  setBusy(true);
  setProgress(0.15);

  try {
    const buffer = await runOpenScad(
      part,
      `Generating ${PARTS.find((item) => item.id === part)?.label ?? part}…`,
    );
    if (cancelled) {
      return;
    }
    setProgress(1);
    await showInViewer(buffer.slice(0));
    saveBlob(
      new Blob([buffer], { type: "model/stl" }),
      partFilename(part),
    );
    statusElement.textContent = "STL generated and downloaded.";
  } catch (error) {
    if (!cancelled) {
      statusElement.textContent = `Generation failed: ${error.message}`;
    }
  } finally {
    setBusy(false);
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

Print the nut-fit coupon before the structural parts.
Recommended starting point: 0.20 mm layers, 4 perimeters, 25% infill,
and no supports.
`;
}

async function downloadBundle(groupId) {
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
    statusElement.textContent = "This configuration does not need a link kit.";
    return;
  }

  cancelled = false;
  setBusy(true);

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
      );
      zip.file(partFilename(part), buffer);
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
    statusElement.textContent = `${group.label} print group downloaded.`;
  } catch (error) {
    if (!cancelled) {
      statusElement.textContent = `Generation failed: ${error.message}`;
    }
  } finally {
    setBusy(false);
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
previewButton.addEventListener("click", buildPreview);
downloadPartButton.addEventListener("click", downloadPart);
for (const button of bundleButtons) {
  button.addEventListener("click", () => downloadBundle(button.dataset.bundle));
}
cancelButton.addEventListener("click", () => {
  cancelled = true;
  activeCancel?.();
  statusElement.textContent = "Generation cancelled.";
  setProgress(0);
  setBusy(false);
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

setFormState(state);

window.__spoolCustomizer = {
  getState: () => ({ ...state }),
  async generateByteLength(part = "nut_fit_test") {
    const buffer = await runOpenScad(part, `Testing ${part}…`);
    statusElement.textContent = "Browser generator verified.";
    return buffer.byteLength;
  },
};
