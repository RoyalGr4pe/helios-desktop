const { app, BrowserWindow, ipcMain, screen, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('ozone-platform', 'x11');

let mainWindow = null;
let mcpProcess = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const MCP_PORT = Number(process.env.HELIOS_MCP_PORT) || 3847;

async function isMcpRunning() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(`http://localhost:${MCP_PORT}/health`, { signal: controller.signal });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null);
    return body?.server === 'helios-mcp';
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function startMcpServer() {
  if (await isMcpRunning()) return;

  const serverPath = path.join(__dirname, '../mcp/server.cjs');
  const taskStoreFile = path.join(app.getPath('userData'), 'agent-tasks.json');
  fs.mkdirSync(path.dirname(taskStoreFile), { recursive: true });

  mcpProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HELIOS_MCP_PORT: String(MCP_PORT),
      HELIOS_TASK_STORE_FILE: taskStoreFile,
    },
    stdio: isDev ? 'inherit' : 'ignore',
  });

  mcpProcess.on('exit', () => {
    mcpProcess = null;
  });
}

function setupAutoStart() {
  if (isDev || process.platform !== 'linux') return;

  const autostartDir = path.join(app.getPath('home'), '.config', 'autostart');
  const desktopFile = path.join(autostartDir, 'helios-desktop.desktop');
  const execPath = process.execPath.replace(/"/g, '\\"');
  const execCommand = process.env.HELIOS_LAUNCH_COMMAND || `"${execPath}" --no-sandbox`;

  fs.mkdirSync(autostartDir, { recursive: true });
  fs.writeFileSync(desktopFile, `[Desktop Entry]
Type=Application
Name=Helios Desktop
Comment=Desktop widgets for clock, weather, calendar and tasks
Exec=${execCommand}
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
`);
}

function createWindow() {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  
  console.error('[Helios] All displays:', JSON.stringify(displays.map(d => ({ id: d.id, label: d.label, bounds: d.bounds })), null, 2));
  console.error('[Helios] Primary display:', JSON.stringify({ id: primary.id, label: primary.label, bounds: primary.bounds }));
  
  let targetDisplay = primary;
  const displayName = process.env.HELIOS_DISPLAY;
  
  if (displayName) {
    console.error('[Helios] Looking for display:', displayName);
    targetDisplay = displays.find(d => d.label.includes(displayName) || d.id.toString() === displayName) || primary;
    console.error('[Helios] Matched display:', JSON.stringify({ id: targetDisplay.id, label: targetDisplay.label, bounds: targetDisplay.bounds }));
  }
  
  const { workArea, bounds } = targetDisplay;
  console.error('[Helios] Using bounds:', JSON.stringify(bounds));

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: false,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  mainWindow.setPosition(bounds.x, bounds.y);

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
    mainWindow.setFocusable(false);
  });

  mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'geolocation');
  });

  await startMcpServer();
  createWindow();
  setupAutoStart();
});
app.on('before-quit', () => {
  if (mcpProcess && !mcpProcess.killed) mcpProcess.kill();
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
  try {
    const response = await fetch(url);
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: JSON.stringify({ message: err instanceof Error ? err.message : 'Network request failed' }),
    };
  }
});
