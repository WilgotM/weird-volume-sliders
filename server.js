const { execFile } = require("node:child_process");
const { createReadStream, statSync } = require("node:fs");
const { createServer } = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const HOST = "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT || "3777", 10);
const ROOT = __dirname;
const PLATFORM = process.platform;

const WINDOWS_VOLUME_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace WeirdVolumeSlider {
  [ComImport]
  [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  public class MMDeviceEnumerator {}

  public enum EDataFlow {
    eRender,
    eCapture,
    eAll
  }

  public enum ERole {
    eConsole,
    eMultimedia,
    eCommunications
  }

  [ComImport]
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
  }

  [ComImport]
  [Guid("D666063F-1587-4E43-81F1-B948E807363F2")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IMMDevice {
    int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioEndpointVolume ppInterface);
  }

  [ComImport]
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IAudioEndpointVolume {
    int RegisterControlChangeNotify(IntPtr pNotify);
    int UnregisterControlChangeNotify(IntPtr pNotify);
    int GetChannelCount(out uint pnChannelCount);
    int SetMasterVolumeLevel(float fLevelDB, Guid pguidEventContext);
    int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
    int GetMasterVolumeLevel(out float pfLevelDB);
    int GetMasterVolumeLevelScalar(out float pfLevel);
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, Guid pguidEventContext);
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, Guid pguidEventContext);
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    int SetMute(bool bMute, Guid pguidEventContext);
    int GetMute(out bool pbMute);
    int GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
    int VolumeStepUp(Guid pguidEventContext);
    int VolumeStepDown(Guid pguidEventContext);
    int QueryHardwareSupport(out uint pdwHardwareSupportMask);
    int GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
  }

  public static class Volume {
    private static IAudioEndpointVolume GetEndpointVolume() {
      IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice device;
      enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device);
      Guid endpointVolumeGuid = typeof(IAudioEndpointVolume).GUID;
      IAudioEndpointVolume endpointVolume;
      device.Activate(ref endpointVolumeGuid, 23, IntPtr.Zero, out endpointVolume);
      return endpointVolume;
    }

    public static int Get() {
      float scalar;
      GetEndpointVolume().GetMasterVolumeLevelScalar(out scalar);
      return (int)Math.Round(scalar * 100);
    }

    public static int Set(int volume) {
      int safeVolume = Math.Max(0, Math.Min(100, volume));
      Guid eventContext = Guid.Empty;
      GetEndpointVolume().SetMasterVolumeLevelScalar(safeVolume / 100.0f, eventContext);
      return safeVolume;
    }
  }
}
"@

if ($args[0] -eq "get") {
  [WeirdVolumeSlider.Volume]::Get()
} elseif ($args[0] -eq "set") {
  [WeirdVolumeSlider.Volume]::Set([int]$args[1])
} else {
  throw "Expected 'get' or 'set'."
}
`;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function clampVolume(value) {
  const nextValue = Math.round(Number(value));
  if (!Number.isFinite(nextValue)) return null;
  return Math.max(0, Math.min(nextValue, 100));
}

function runAppleScript(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script, ...args], (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function runPowerShell(script, args = []) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script, ...args],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve(stdout.trim());
      },
    );
  });
}

async function getSystemVolume() {
  if (PLATFORM === "win32") {
    const output = await runPowerShell(WINDOWS_VOLUME_SCRIPT, ["get"]);
    return clampVolume(output);
  }

  if (PLATFORM !== "darwin") {
    throw new Error(`Real system volume is not supported on ${PLATFORM}.`);
  }

  const output = await runAppleScript("output volume of (get volume settings)");
  return clampVolume(output);
}

async function setSystemVolume(volume) {
  const safeVolume = clampVolume(volume);
  if (safeVolume == null) {
    throw new Error("Volume must be a number from 0 to 100.");
  }

  if (PLATFORM === "win32") {
    const output = await runPowerShell(WINDOWS_VOLUME_SCRIPT, [
      "set",
      String(safeVolume),
    ]);
    return clampVolume(output) ?? safeVolume;
  }

  if (PLATFORM !== "darwin") {
    throw new Error(`Real system volume is not supported on ${PLATFORM}.`);
  }

  await runAppleScript(
    "on run argv\nset volume output volume (item 1 of argv as integer)\nend run",
    [String(safeVolume)],
  );
  return safeVolume;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2048) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleVolumeApi(req, res) {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }

  try {
    if (req.method === "GET") {
      sendJson(res, 200, { volume: await getSystemVolume() });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const parsed = body ? JSON.parse(body) : {};
      const volume = await setSystemVolume(parsed.volume);
      sendJson(res, 200, { volume });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Unable to set volume." });
  }
}

function resolveStaticPath(urlPathname) {
  const decodedPathname = decodeURIComponent(urlPathname);
  const normalizedPathname =
    decodedPathname.endsWith("/") ? `${decodedPathname}index.html` : decodedPathname;
  const filePath = path.resolve(ROOT, `.${normalizedPathname}`);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return null;
  }

  return filePath;
}

function serveStatic(req, res, urlPathname) {
  const filePath = resolveStaticPath(urlPathname);
  if (!filePath) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  if (!stats.isFile()) {
    send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Length": stats.size,
    "Content-Type": MIME_TYPES[extname] || "application/octet-stream",
  });
  createReadStream(filePath).pipe(res);
}

function createVolumeServer() {
  return createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);

  if (requestUrl.pathname === "/api/volume") {
    void handleVolumeApi(req, res);
    return;
  }

  serveStatic(req, res, requestUrl.pathname);
  });
}

function startServer(port = PORT, host = HOST) {
  const server = createVolumeServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve({
        host,
        port,
        server,
        url: `http://${host}:${port}`,
      });
    });
  });
}

if (require.main === module) {
  startServer()
    .then(({ url }) => {
      console.log(`Real system volume sliders: ${url}`);
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
}

module.exports = {
  HOST,
  PORT,
  startServer,
};
