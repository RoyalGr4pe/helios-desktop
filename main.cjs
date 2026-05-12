const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function setupAutoStart() {
  if (isDev || process.platform !== 'linux') return;

  const autostartDir = path.join(app.getPath('home'), '.config', 'autostart');
  const desktopFile = path.join(autostartDir, 'helios-desktop.desktop');
  const execPath = process.execPath.replace(/"/g, '\\"');

  fs.mkdirSync(autostartDir, { recursive: true });
  fs.writeFileSync(desktopFile, `[Desktop Entry]
Type=Application
Name=Helios Desktop
Comment=Desktop widgets for clock, weather, calendar and tasks
Exec="${execPath}" --no-sandbox
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
`);
}

function createWindow() {
  const primary = screen.getPrimaryDisplay();
  const { workArea } = primary;

  mainWindow = new BrowserWindow({
    width: workArea.width,
    height: workArea.height,
    x: workArea.x,
    y: workArea.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  const filePath = isDev 
    ? 'http://localhost:5173' 
    : path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL(filePath);
  } else {
    mainWindow.loadFile(filePath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'geolocation');
  });

  createWindow();
  setupAutoStart();
});
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (!mainWindow) createWindow(); });

ipcMain.on('window-minimize', () => mainWindow?.hide());
ipcMain.on('window-close', () => mainWindow?.hide());
ipcMain.on('toggle-click-through', (_event, enabled) => {
  mainWindow?.setIgnoreMouseEvents(enabled, { forward: true });
});
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('http-get', async (_event, url) => {
  const response = await fetch(url);
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
});
