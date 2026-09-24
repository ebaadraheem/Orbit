const { contextBridge, ipcRenderer } = require("electron");

/**
 * The only surface the renderer gets. Everything here is a thin pass-through;
 * no Node APIs are exposed.
 */
contextBridge.exposeInMainWorld("orbit", {
  platform: process.platform,

  minimize: () => ipcRenderer.send("window:minimize"),
  toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
  close: () => ipcRenderer.send("window:close"),

  /** Subscribe to OrbitEvents emitted by the agent process. Returns an unsubscribe. */
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("orbit:event", listener);
    return () => ipcRenderer.removeListener("orbit:event", listener);
  },

  /** Send a command to the agent process: "listen", "cancel", "submit", … */
  send: (command, payload) => ipcRenderer.send("orbit:command", { command, payload }),
});
