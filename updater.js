// ===== NotaB Auto-Updater =====
// GitHub Releases API üzerinden güncelleme kontrolü, indirme ve kurulum

const { net, app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

const GITHUB_OWNER = 'ebuword';
const GITHUB_REPO = 'NotaB';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 saat
const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

let latestRelease = null;
let updateCheckTimer = null;
let onUpdateCallback = null; // callback to notify main process

// ===== Semver Comparison =====
function parseVersion(v) {
  const clean = v.replace(/^v/, '');
  const parts = clean.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function isNewerVersion(latest, current) {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  return l.patch > c.patch;
}

// ===== GitHub API =====
function checkForUpdates() {
  return new Promise((resolve, reject) => {
    console.log('[Updater] Checking for updates...');
    const currentVersion = app.getVersion();

    const request = net.request({
      url: API_URL,
      method: 'GET',
    });

    request.setHeader('User-Agent', `NotaB/${currentVersion}`);
    request.setHeader('Accept', 'application/vnd.github.v3+json');

    let body = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        request.abort();
        console.warn('[Updater] Request timed out');
        resolve(null);
      }
    }, 15000);

    request.on('response', (response) => {
      response.on('data', (chunk) => {
        body += chunk.toString();
      });

      response.on('end', () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);

        try {
          const release = JSON.parse(body);

          if (!release.tag_name) {
            console.log('[Updater] No release found or API error');
            resolve(null);
            return;
          }

          const latestVersion = release.tag_name.replace(/^v/, '');
          console.log(`[Updater] Current: v${currentVersion} | Latest: v${latestVersion}`);

          if (isNewerVersion(latestVersion, currentVersion)) {
            // Find the .exe asset (setup file)
            const setupAsset = release.assets?.find(a =>
              a.name.toLowerCase().endsWith('.exe') &&
              a.name.toLowerCase().includes('setup')
            );

            latestRelease = {
              version: latestVersion,
              tagName: release.tag_name,
              name: release.name || `v${latestVersion}`,
              body: release.body || '',
              downloadUrl: setupAsset?.browser_download_url || null,
              downloadSize: setupAsset?.size || 0,
              htmlUrl: release.html_url,
              publishedAt: release.published_at
            };

            console.log(`[Updater] Update available! v${latestVersion}`);

            if (onUpdateCallback) {
              onUpdateCallback(latestRelease);
            }

            resolve(latestRelease);
          } else {
            console.log('[Updater] No update available. You are up to date.');
            latestRelease = null;
            resolve(null);
          }
        } catch (err) {
          console.warn('[Updater] Failed to parse response:', err.message);
          resolve(null);
        }
      });

      response.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.warn('[Updater] Response error:', err.message);
          resolve(null);
        }
      });
    });

    request.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.warn('[Updater] Request error:', err.message);
        resolve(null);
      }
    });

    request.end();
  });
}

// ===== Download Update =====
function downloadUpdate(downloadUrl) {
  return new Promise((resolve, reject) => {
    if (!downloadUrl) {
      reject(new Error('No download URL available'));
      return;
    }

    const fileName = path.basename(downloadUrl);
    const tempPath = path.join(os.tmpdir(), fileName);

    console.log(`[Updater] Downloading update to: ${tempPath}`);

    const request = net.request({
      url: downloadUrl,
      method: 'GET',
    });

    request.setHeader('User-Agent', `NotaB/${app.getVersion()}`);

    let resolved = false;

    request.on('response', (response) => {
      // Handle redirects (GitHub uses 302 for asset downloads)
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          console.log('[Updater] Following redirect...');
          downloadUpdate(Array.isArray(redirectUrl) ? redirectUrl[0] : redirectUrl)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      const fileStream = fs.createWriteStream(tempPath);
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        fileStream.write(chunk);
        downloadedSize += chunk.length;

        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          if (percent % 10 === 0) {
            console.log(`[Updater] Download progress: ${percent}%`);
          }
        }
      });

      response.on('end', () => {
        if (resolved) return;
        resolved = true;
        fileStream.end(() => {
          console.log('[Updater] Download complete!');
          resolve(tempPath);
        });
      });

      response.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          fileStream.end();
          try { fs.unlinkSync(tempPath); } catch (_) {}
          reject(err);
        }
      });
    });

    request.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    });

    request.end();
  });
}

// ===== Install Update =====
async function installUpdate(filePath) {
  console.log(`[Updater] Launching installer: ${filePath}`);
  // Launch the installer and quit the app
  shell.openPath(filePath);
  // Give a moment for the installer to start
  setTimeout(() => {
    app.quit();
  }, 1000);
}

// ===== Show Update Dialog =====
async function showUpdateDialog(parentWindow) {
  if (!latestRelease) return;

  const sizeMB = latestRelease.downloadSize
    ? `(${(latestRelease.downloadSize / (1024 * 1024)).toFixed(1)} MB)`
    : '';

  const result = await dialog.showMessageBox(parentWindow, {
    type: 'info',
    title: 'NotaB Güncelleme Mevcut',
    message: `Yeni sürüm: NotaB v${latestRelease.version}`,
    detail: `Mevcut sürümünüz: v${app.getVersion()}\n\nGüncelleme indirip kurulsun mu? ${sizeMB}\n\nDeğişiklikler:\n${(latestRelease.body || '').substring(0, 300)}`,
    buttons: ['Güncelle', 'Sonra', 'Release Sayfası'],
    defaultId: 0,
    cancelId: 1,
    icon: null
  });

  if (result.response === 0) {
    // Güncelle
    if (latestRelease.downloadUrl) {
      try {
        // Show downloading dialog
        dialog.showMessageBox(parentWindow, {
          type: 'info',
          title: 'İndiriliyor...',
          message: 'Güncelleme indiriliyor, lütfen bekleyin...',
          buttons: [],
          noLink: true
        }).catch(() => {});

        const filePath = await downloadUpdate(latestRelease.downloadUrl);
        await installUpdate(filePath);
      } catch (err) {
        console.error('[Updater] Download failed:', err.message);
        dialog.showMessageBox(parentWindow, {
          type: 'error',
          title: 'İndirme Hatası',
          message: 'Güncelleme indirilemedi.',
          detail: `Hata: ${err.message}\n\nRelease sayfasından manuel olarak indirebilirsiniz.`,
          buttons: ['Tamam']
        });
      }
    } else {
      // No direct download, open release page
      shell.openExternal(latestRelease.htmlUrl);
    }
  } else if (result.response === 2) {
    // Release Sayfası
    shell.openExternal(latestRelease.htmlUrl);
  }
}

// ===== Init =====
function initAutoUpdater(callback) {
  onUpdateCallback = callback;

  // First check after 10 seconds (let app initialize)
  setTimeout(() => {
    checkForUpdates();
  }, 10000);

  // Periodic checks
  updateCheckTimer = setInterval(() => {
    checkForUpdates();
  }, CHECK_INTERVAL);
}

function stopAutoUpdater() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

function getLatestRelease() {
  return latestRelease;
}

module.exports = {
  initAutoUpdater,
  stopAutoUpdater,
  checkForUpdates,
  showUpdateDialog,
  downloadUpdate,
  installUpdate,
  getLatestRelease,
  isNewerVersion
};
