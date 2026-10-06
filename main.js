const { app, BrowserWindow, globalShortcut, ipcMain, shell, Tray, Menu, screen, nativeImage, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ws = require('windows-shortcuts');
const updater = require('./updater');

// Fix Windows Notification Title
app.setAppUserModelId('NotaB');

let mainWindow = null;
let tray = null;
let installedApps = [];
let appUsageData = {};
const usageFilePath = path.join(app.getPath('userData'), 'app-usage.json');

// ===== App Usage Tracking =====
function loadUsageData() {
  try {
    if (fs.existsSync(usageFilePath)) {
      appUsageData = JSON.parse(fs.readFileSync(usageFilePath, 'utf-8'));
    }
  } catch (e) {
    appUsageData = {};
  }
}

function saveUsageData() {
  try {
    fs.writeFileSync(usageFilePath, JSON.stringify(appUsageData), 'utf-8');
  } catch (e) {
    // Ignore write errors
  }
}

function trackUsage(appName) {
  const key = appName.toLowerCase();
  appUsageData[key] = (appUsageData[key] || 0) + 1;
  saveUsageData();
}

function getUsageScore(appName) {
  return appUsageData[appName.toLowerCase()] || 0;
}

// ===== Fuzzy Search Scoring =====
function searchScore(name, query) {
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match
  if (lowerName === lowerQuery) return 100;

  // Prefix match (strongest)
  if (lowerName.startsWith(lowerQuery)) return 80;

  // Word-boundary match (e.g., "cod" matches "Visual Studio Code")
  const words = lowerName.split(/[\s\-_.,]+/);
  for (const word of words) {
    if (word.startsWith(lowerQuery)) return 60;
  }

  // Contains match
  if (lowerName.includes(lowerQuery)) return 40;

  // Fuzzy character matching
  let qi = 0;
  let consecutive = 0;
  let maxConsecutive = 0;
  for (let ni = 0; ni < lowerName.length && qi < lowerQuery.length; ni++) {
    if (lowerName[ni] === lowerQuery[qi]) {
      qi++;
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }

  if (qi === lowerQuery.length) {
    return 10 + maxConsecutive * 5;
  }

  return 0; // No match
}

// ===== App Scanner =====
async function scanDirectory(dirPath) {
  let results = [];
  try {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const subResults = await scanDirectory(fullPath);
        results = results.concat(subResults);
      } else if (item.name.toLowerCase().endsWith('.lnk')) {
        results.push(fullPath);
      } else if (item.name.toLowerCase().endsWith('.exe')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore access denied etc.
  }
  return results;
}

function resolveShortcut(lnkPath) {
  return new Promise((resolve) => {
    ws.query(lnkPath, (err, options) => {
      if (err || !options || (!options.target && !options.args)) {
        resolve(null);
      } else {
        resolve({
          path: lnkPath,
          name: path.parse(lnkPath).name,
          target: options.target || lnkPath
        });
      }
    });
  });
}

async function scanApps() {
  console.log('Scanning installed applications...');
  const appData = process.env.APPDATA;
  const programData = process.env.PROGRAMDATA;

  const startMenuDirs = [
    path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    path.join(programData, 'Microsoft', 'Windows', 'Start Menu', 'Programs')
  ];

  let allLinks = [];
  for (const dir of startMenuDirs) {
    if (fs.existsSync(dir)) {
      const links = await scanDirectory(dir);
      allLinks = allLinks.concat(links);
    }
  }

  // Resolve all shortcuts
  const promises = allLinks.filter(l => l.endsWith('.lnk')).map(resolveShortcut);
  const resolved = await Promise.all(promises);

  // Also add direct .exe files found
  const exes = allLinks.filter(l => l.endsWith('.exe')).map(p => ({
    path: p,
    name: path.parse(p).name,
    target: p
  }));

  // Filter out invalid ones and uninstallers
  const validApps = [...resolved.filter(r => r !== null), ...exes]
    .filter(entry => !entry.name.toLowerCase().includes('uninstall'))
    .filter(entry => !entry.name.toLowerCase().includes('kaldır'));

  // Deduplicate by name
  const uniqueApps = [];
  const names = new Set();

  for (const entry of validApps) {
    if (!names.has(entry.name.toLowerCase())) {
      names.add(entry.name.toLowerCase());
      uniqueApps.push(entry);
    }
  }

  installedApps = uniqueApps;
  console.log(`Found ${installedApps.length} applications.`);

  // Pre-load icons in background
  preloadIcons();
}

async function preloadIcons() {
  console.log('Pre-loading app icons...');
  let loaded = 0;
  const batchSize = 10;

  for (let i = 0; i < installedApps.length; i += batchSize) {
    const batch = installedApps.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(async (entry) => {
      try {
        const icon = await app.getFileIcon(entry.target, { size: 'normal' });
        if (icon) {
          entry.iconDataUrl = icon.toDataURL();
          loaded++;
        }
      } catch (e) {
        // Ignore icon errors
      }
    }));
  }

  console.log(`Pre-loaded ${loaded} app icons.`);
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 680;
  const winHeight = 650;

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.round((screenWidth - winWidth) / 2),
    y: Math.round(screenHeight * 0.22),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    hideWindow();
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

function showWindow() {
  // Reposition to center of current screen
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { x: dX, y: dY, width: dW, height: dH } = currentDisplay.workArea;
  const [winW, winH] = mainWindow.getSize();

  mainWindow.setPosition(
    Math.round(dX + (dW - winW) / 2),
    Math.round(dY + dH * 0.22)
  );

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('window-shown');
}

function hideWindow() {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.webContents.send('window-hidden');
    mainWindow.hide();
  }
}

// Check if started with --hidden flag (auto-start scenario)
const startHidden = process.argv.includes('--hidden');

app.whenReady().then(() => {
  loadUsageData();
  createWindow();

  // Enable auto-start on Windows login
  if (!app.isPackaged) {
    console.log('Dev mode: skipping auto-start registration');
  } else {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
      args: ['--hidden']
    });
  }

  // Scan installed apps in the background
  scanApps();

  // Initialize auto-updater
  updater.initAutoUpdater((release) => {
    // Update available callback — update tray menu and show balloon
    if (tray) {
      // Rebuild tray menu with update option
      const contextMenu = Menu.buildFromTemplate([
        { label: 'Göster', click: () => showWindow() },
        { type: 'separator' },
        { label: `🔄 Güncelle (v${release.version})`, click: () => updater.showUpdateDialog(mainWindow) },
        { type: 'separator' },
        { label: 'Çıkış', click: () => app.quit() }
      ]);
      tray.setContextMenu(contextMenu);

      // Show balloon notification
      tray.displayBalloon({
        title: 'NotaB Güncelleme Mevcut!',
        content: `Yeni sürüm v${release.version} indirilebilir. Güncellemek için tray menüsünden "Güncelle" seçeneğine tıklayın.`,
        iconType: 'info',
        respectQuietTime: true
      });
    }
  });

  // Try Alt+Space first (may fail on Windows — system reserves it)
  let shortcutKey = 'Alt+Space';
  let ret = globalShortcut.register(shortcutKey, () => toggleWindow());

  if (!ret) {
    // Fallback to Ctrl+Space
    shortcutKey = 'CommandOrControl+Space';
    ret = globalShortcut.register(shortcutKey, () => toggleWindow());
  }

  if (!ret) {
    console.error('Shortcut registration failed completely');
  } else {
    console.log(`Shortcut registered: ${shortcutKey}`);
  }

  // System tray
  createTray(shortcutKey);

  // If started with --hidden, don't show the balloon (silent start)
  if (startHidden) {
    console.log('Started in hidden mode (auto-start)');
  }
});

function createTray(shortcutKey) {
  // Use the NotaB logo
  const iconPath = path.join(__dirname, 'renderer', 'icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  // Resize to 16x16 for system tray
  icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('NotaB Launcher');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Göster', click: () => showWindow() },
    { type: 'separator' },
    { label: 'Çıkış', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('click', () => toggleWindow());

  // Show startup balloon notification (skip if auto-started silently)
  if (!startHidden) {
    setTimeout(() => {
      tray.displayBalloon({
        title: 'NotaB Launcher Başlatıldı',
        content: `Arama menüsünü açmak için ${shortcutKey || 'Alt+Space'} tuşlarına basabilirsiniz.`,
        iconType: 'info',
        respectQuietTime: true,
        noSound: true // Explicitly mute the notification sound
      });
    }, 500);
  }
}

// IPC handlers
ipcMain.on('hide-window', () => {
  hideWindow();
});

// Update IPC handlers
ipcMain.handle('check-for-updates', async () => {
  const release = await updater.checkForUpdates();
  return release;
});

ipcMain.on('show-update-dialog', () => {
  updater.showUpdateDialog(mainWindow);
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
  hideWindow();
});

ipcMain.handle('search-apps', async (event, query) => {
  if (!query || query.length < 2) return [];

  // Score and sort results using fuzzy search
  const scored = installedApps
    .map(entry => ({ entry, score: searchScore(entry.name, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      // First by search score desc, then by usage frequency desc
      if (b.score !== a.score) return b.score - a.score;
      return getUsageScore(b.entry.name) - getUsageScore(a.entry.name);
    })
    .slice(0, 5);

  return scored.map(({ entry }) => ({
    name: entry.name,
    path: entry.target,
    icon: entry.iconDataUrl || null
  }));
});

ipcMain.on('open-app', (event, appPath) => {
  // Find the app name for tracking
  const found = installedApps.find(e => e.target === appPath);
  if (found) {
    trackUsage(found.name);
  }
  shell.openPath(appPath);
  hideWindow();
});

// URL Meta Fetching
ipcMain.handle('fetch-url-meta', async (event, url) => {
  try {
    const { net } = require('electron');
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;

    const html = await new Promise((resolve, reject) => {
      const request = net.request({
        url: url,
        method: 'GET',
      });

      request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      request.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');
      request.setHeader('Accept-Language', 'en-US,en;q=0.5');

      let body = '';
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          request.abort();
          reject(new Error('Timeout'));
        }
      }, 6000);

      request.on('response', (response) => {
        // Follow redirects are handled automatically by net module
        response.on('data', (chunk) => {
          body += chunk.toString();
          // Only read first 50KB to get meta tags
          if (body.length > 50000 && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(body);
            request.abort();
          }
        });
        response.on('end', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(body);
          }
        });
        response.on('error', (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            reject(err);
          }
        });
      });

      request.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      request.end();
    });

    // Parse meta information from HTML
    const getMetaContent = (html, nameOrProperty) => {
      // Try property first (og:), then name
      const patterns = [
        new RegExp(`<meta[^>]*property=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${nameOrProperty}["']`, 'i'),
        new RegExp(`<meta[^>]*name=["']${nameOrProperty}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${nameOrProperty}["']`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1].trim();
      }
      return '';
    };

    // Title: og:title > <title>
    let title = getMetaContent(html, 'og:title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
    }

    // Description: og:description > meta description
    let description = getMetaContent(html, 'og:description');
    if (!description) description = getMetaContent(html, 'description');

    // Image: og:image
    let image = getMetaContent(html, 'og:image');
    if (image && !image.startsWith('http')) {
      image = new URL(image, url).href;
    }

    // Favicon
    let favicon = '';
    const faviconPatterns = [
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i,
      /<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i,
    ];
    for (const pattern of faviconPatterns) {
      const match = html.match(pattern);
      if (match) {
        favicon = match[1].trim();
        break;
      }
    }
    if (favicon && !favicon.startsWith('http')) {
      favicon = new URL(favicon, url).href;
    }
    // Fallback to Google Favicon API
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    // Site name
    let siteName = getMetaContent(html, 'og:site_name') || domain;

    // Decode HTML entities
    const decodeEntities = (str) => {
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/');
    };

    return {
      success: true,
      title: decodeEntities(title || domain),
      description: decodeEntities(description || ''),
      image: image || '',
      favicon: favicon,
      siteName: decodeEntities(siteName),
      domain: domain,
      url: url,
    };
  } catch (err) {
    console.warn('URL meta fetch failed:', err.message);
    try {
      const parsedUrl = new URL(url);
      return {
        success: false,
        title: parsedUrl.hostname,
        description: '',
        image: '',
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
        siteName: parsedUrl.hostname,
        domain: parsedUrl.hostname,
        url: url,
      };
    } catch {
      return {
        success: false,
        title: url,
        description: '',
        image: '',
        favicon: '',
        siteName: url,
        domain: url,
        url: url,
      };
    }
  }
});

// Clipboard support
ipcMain.on('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
