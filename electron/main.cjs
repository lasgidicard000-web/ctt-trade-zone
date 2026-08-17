const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const LIVE_URL = "https://ctttradezone.com";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0b1020",
    title: "ctttradezone",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const loadLocal = () =>
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));

  win.loadURL(LIVE_URL).catch(loadLocal);
  win.webContents.on("did-fail-load", (_event, _code, _desc, url, isMainFrame) => {
    if (isMainFrame && url.startsWith(LIVE_URL)) loadLocal();
  });

  // Open external links in the user's browser, keep app navigation in-window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
};

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
