const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

/** @type {BrowserWindow | null} */
let window = null;

function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: "#0a0b0d",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Avoid a white flash before the renderer paints.
  window.once("ready-to-show", () => window?.show());

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // External links open in the real browser, never inside the app shell.
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.on("closed", () => {
    window = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------------------------------------------------------------------------
 * Where the agent process will eventually connect.
 *
 * The renderer already speaks the OrbitEvent protocol (src/orbit/events.ts).
 * When the Python side exists, forward its events with:
 *
 *   window.webContents.send("orbit:event", event);
 *
 * and handle commands coming back from the UI here.
 * ------------------------------------------------------------------------- */
ipcMain.on("orbit:command", (_event, message) => {
  if (isDev) console.log("[orbit] command from renderer:", message);
});

ipcMain.on("window:minimize", () => window?.minimize());
ipcMain.on("window:toggle-maximize", () => {
  if (!window) return;
  window.isMaximized() ? window.unmaximize() : window.maximize();
});
ipcMain.on("window:close", () => window?.close());
