const { app, BrowserWindow, protocol, shell } = require("electron");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "parola",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
      stream: true
    }
  }
]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

let mainWindow = null;

function log(message) {
  try {
    fsSync.appendFileSync(path.join(app.getPath("userData"), "parola.log"), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // Ein Diagnoseprotokoll darf den Programmstart niemals verhindern.
  }
}

function webRoot() {
  return path.join(app.getAppPath(), "www");
}

async function serveParola(request) {
  const url = new URL(request.url);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const relativePath = requestedPath.replace(/^[/\\]+/, "");
  const root = webRoot();
  const filename = path.resolve(root, relativePath);

  if (filename !== root && !filename.startsWith(`${root}${path.sep}`)) {
    return new Response("Nicht erlaubt", { status: 403 });
  }

  try {
    const body = await fs.readFile(filename);
    return new Response(body, {
      headers: {
        "Content-Type": mimeTypes[path.extname(filename).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      }
    });
  } catch {
    return new Response("Datei nicht gefunden", { status: 404 });
  }
}

function createWindow() {
  log("Fenster wird erstellt.");
  mainWindow = new BrowserWindow({
    title: "Parola",
    width: 460,
    height: 850,
    minWidth: 390,
    minHeight: 650,
    backgroundColor: "#f7f3ea",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL("parola://app/").then(() => log("Oberfläche wurde geladen.")).catch((error) => log(`Ladefehler: ${error.stack || error}`));
}

app.whenReady().then(() => {
  log("Electron ist bereit.");
  protocol.handle("parola", serveParola);
  app.setName("Parola");
  app.on("web-contents-created", (_event, contents) => {
    contents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === "media");
    });
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => log(`Startfehler: ${error.stack || error}`));

process.on("uncaughtException", (error) => log(`Unbehandelter Fehler: ${error.stack || error}`));
process.on("unhandledRejection", (error) => log(`Unbehandeltes Promise: ${error?.stack || error}`));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
