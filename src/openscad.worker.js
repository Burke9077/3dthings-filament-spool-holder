function formatDefinition(name, value) {
  if (typeof value === "string") {
    const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    return `${name}="${escaped}"`;
  }
  if (typeof value === "boolean") {
    return `${name}=${value ? "true" : "false"}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${name}=${value}`;
  }
  throw new Error(`Unsupported OpenSCAD value for ${name}`);
}

self.addEventListener("message", async (event) => {
  const {
    id,
    moduleUrl,
    wasmUrl,
    source,
    definitions,
  } = event.data;
  const stderr = [];

  try {
    self.postMessage({ id, type: "status", message: "Loading OpenSCAD…" });
    const imported = await import(/* @vite-ignore */ moduleUrl);
    const OpenSCAD = imported.default;
    const instance = await OpenSCAD({
      noInitialRun: true,
      locateFile(path) {
        return path.endsWith(".wasm") ? wasmUrl : path;
      },
      print(text) {
        self.postMessage({ id, type: "log", stream: "stdout", text });
      },
      printErr(text) {
        stderr.push(text);
        self.postMessage({ id, type: "log", stream: "stderr", text });
      },
    });

    self.postMessage({ id, type: "status", message: "Compiling geometry…" });
    const inputPath = "/holder.scad";
    const outputPath = "/output.stl";
    instance.FS.writeFile(inputPath, source);

    const args = [
      inputPath,
      "--hardwarnings",
      "--export-format",
      "binstl",
      "-o",
      outputPath,
    ];

    for (const [name, value] of Object.entries(definitions)) {
      args.push("-D", formatDefinition(name, value));
    }

    let exitCode;
    try {
      exitCode = instance.callMain(args);
    } catch (error) {
      const formatted =
        typeof error === "number" && instance.formatException
          ? instance.formatException(error)
          : error;
      throw new Error(
        `OpenSCAD invocation failed: ${formatted}. ${stderr.slice(-5).join(" ")}`,
      );
    }
    if (exitCode !== 0) {
      throw new Error(
        `OpenSCAD exited with code ${exitCode}. ${stderr.slice(-3).join(" ")}`,
      );
    }

    const output = instance.FS.readFile(outputPath);
    const buffer = output.buffer.slice(
      output.byteOffset,
      output.byteOffset + output.byteLength,
    );
    self.postMessage(
      { id, type: "result", buffer, stderr },
      [buffer],
    );
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      stderr,
    });
  }
});
