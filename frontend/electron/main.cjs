const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("node:path");
const WebSocket = require("ws");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

const WS_URL = process.env.ORBIT_WS_URL || "ws://127.0.0.1:8765/ws";
const RECONNECT_DELAY_MS = 2000;

/** @type {BrowserWindow | null} */
let window = null;
/** @type {WebSocket | null} */
let socket = null;
let reconnectTimer = null;
let commandQueue = [];

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

  window.once("ready-to-show", () => window?.show());

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  window.on("closed", () => {
    window = null;
  });
}

/* ---------------------------------------------------------------------------
 * Connection to the Orbit backend (app/server.py).
 * ------------------------------------------------------------------------- */
function connectBackend() {
  if (socket) return;
  socket = new WebSocket(WS_URL);

  socket.on("open", () => {
    console.log("[orbit] connected to backend at", WS_URL);
    for (const message of commandQueue) socket.send(JSON.stringify(message));
    commandQueue = [];
  });

  socket.on("message", (data) => {
    let event;
    try {
      event = JSON.parse(data.toString());
    } catch {
      return; // malformed frame — drop it rather than crash the renderer
    }
    window?.webContents.send("orbit:event", event);
  });

  socket.on("close", () => {
    socket = null;
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectBackend();
      }, RECONNECT_DELAY_MS);
    }
  });

  socket.on("error", (err) => {
    if (isDev) console.warn("[orbit] backend connection error:", err.message);
    // "close" always follows "error" on a ws client socket
  });
}

function sendToBackend(command, payload) {
  const message = { command, payload };
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    commandQueue.push(message);
    if (commandQueue.length > 50) commandQueue.shift(); // don't grow unboundedly if the backend never comes up
  }
}

app.whenReady().then(() => {
  createWindow();
  connectBackend();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (socket) socket.close();
  if (reconnectTimer) clearTimeout(reconnectTimer);
});

ipcMain.on("orbit:command", (_event, message) => {
  if (isDev) console.log("[orbit] command from renderer:", message);
  sendToBackend(message.command, message.payload);
});

ipcMain.on("window:minimize", () => window?.minimize());
ipcMain.on("window:toggle-maximize", () => {
  if (!window) return;
  window.isMaximized() ? window.unmaximize() : window.maximize();
});
ipcMain.on("window:close", () => window?.close());
