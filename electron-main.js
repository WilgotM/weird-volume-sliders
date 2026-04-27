const { app, BrowserWindow, dialog, shell } = require("electron");
const path = require("node:path");
const { startServer } = require("./server");

let mainWindow = null;
let volumeServer = null;

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 860,
    minHeight: 640,
    title: "Weird Volume Sliders",
    backgroundColor: "#f2f1ec",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    shell.openExternal(nextUrl);
    return { action: "deny" };
  });

  mainWindow.loadURL(url);
}

async function boot() {
  try {
    volumeServer = await startServer();
    createWindow(volumeServer.url);
  } catch (error) {
    dialog.showErrorBox(
      "Weird Volume Sliders could not start",
      `The local volume helper could not start.\n\n${error.message || error}`,
    );
    app.quit();
  }
}

app.whenReady().then(boot);

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0 && volumeServer) {
    createWindow(volumeServer.url);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
