const { app, BrowserWindow, ipcMain, dialog, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Определяем пути в зависимости от режима
const isDev = process.env.NODE_ENV === 'development' || 
              process.argv.some(arg => arg.includes('--dev')) ||
              !fs.existsSync(path.join(__dirname, 'angular-app', 'dist', 'angular-app', 'index.html')) &&
              !fs.existsSync(path.join(__dirname, 'angular-app', 'dist', 'angular-app', 'browser', 'index.html'));

console.log('=== Режим запуска ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('процесс.argv:', process.argv);
console.log('isDev:', isDev);
console.log('====================');

// Пути к файлам
let assetsPath, preloadPath, indexPath, dbPath, settingsPath;

if (isDev) {
  // Режим разработки
  assetsPath = path.join(__dirname, 'assets');
  preloadPath = path.join(__dirname, 'angular-app', 'src', 'preload.js');
  indexPath = 'http://localhost:4200';
  dbPath = path.join(app.getPath('userData'), 'library.json');
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
} else {
  // Production режим (упаковано в asar)
  assetsPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets');
  preloadPath = path.join(__dirname, 'preload.js'); // preload.js должен быть распакован
  dbPath = path.join(app.getPath('userData'), 'library.json');
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  
  // Пытаемся найти index.html
  const possiblePaths = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'angular-app', 'dist', 'angular-app', 'index.html'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'angular-app', 'dist', 'angular-app', 'browser', 'index.html'),
    path.join(__dirname, 'angular-app', 'dist', 'angular-app', 'index.html'),
    path.join(__dirname, 'angular-app', 'dist', 'angular-app', 'browser', 'index.html'),
    path.join(process.resourcesPath, 'app', 'angular-app', 'dist', 'angular-app', 'index.html')
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      indexPath = p;
      console.log('Найден index.html:', p);
      break;
    }
  }
  
  if (!indexPath) {
    console.error('index.html не найден! Проверенные пути:', possiblePaths);
    // Показываем сообщение об ошибке
    indexPath = null;
  }
}

// Настройки по умолчанию
const DEFAULT_SETTINGS = {
  autostart: false,
  minimizeToTray: true,
  startupMinimized: false,
  theme: 'dark'
};

let mainWindow = null;
let tray = null;

// ========== ФУНКЦИИ РАБОТЫ С ФАЙЛАМИ ==========

function readDB() {
  try {
    if (!fs.existsSync(dbPath)) {
      const defaultData = [];
      fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка чтения БД:', error);
    return [];
  }
}

function writeDB(data) {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка записи БД:', error);
    return false;
  }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Ошибка загрузки настроек:', error);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error);
    return false;
  }
}

// ========== ОСНОВНОЕ ОКНО ==========

function createWindow() {
  const settings = loadSettings();
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      webSecurity: false // Разрешаем загрузку локальных ресурсов
    },
    show: !settings.startupMinimized,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f172a'
  });

  // Загрузка Angular приложения
  if (isDev) {
    mainWindow.loadURL(indexPath);
    mainWindow.webContents.openDevTools();
    console.log('Development mode: loading from', indexPath);
  } else if (indexPath) {
    //mainWindow.loadFile(path.join(__dirname, 'angular-app', 'dist', 'angular-app', 'index.html'));
    // Production режим
    console.log('Production mode: loading from', indexPath);
    
    // Пробуем загрузить как файл
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      // Или показываем страницу с ошибкой
      showErrorPage('Файл index.html не найден');
    }
  } else {
    // Не удалось найти файл
    showErrorPage('Не удалось загрузить приложение');
  }

  // Создание иконки в трее
  createTray();

  // Обработка закрытия окна
  mainWindow.on('close', (event) => {
    const settings = loadSettings();
    if (settings.minimizeToTray && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Ошибка загрузки:', errorCode, errorDescription);
    
    if (!isDev) {
      showErrorPage(`Ошибка загрузки: ${errorDescription}`);
    }
  });
}

function showErrorPage(message) {
  const errorHTML = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <title>Ошибка</title>
      <style>
          body { 
              background: #0f172a; 
              color: #f1f5f9; 
              font-family: 'Segoe UI', sans-serif; 
              padding: 40px;
              text-align: center;
          }
          h1 { color: #ef4444; }
          .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: #1e293b; 
              padding: 30px; 
              border-radius: 10px;
              border: 1px solid #475569;
          }
          code { 
              background: #334155; 
              padding: 2px 6px; 
              border-radius: 4px; 
              font-family: 'Consolas', monospace;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>⚠️ Ошибка загрузки приложения</h1>
          <p>${message}</p>
          <hr>
          <h3>Возможные решения:</h3>
          <ol style="text-align: left;">
              <li>Переустановите приложение</li>
              <li>Убедитесь что все файлы присутствуют в папке с приложением</li>
              <li>Проверьте права доступа к файлам</li>
          </ol>
          <p>Путь к файлам: <code>${__dirname}</code></p>
      </div>
  </body>
  </html>`;
  
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
}

// ========== ИКОНКА В ТРЕЕ ==========

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'tray-icon.ico');
    const iconExists = fs.existsSync(iconPath);
    
    const trayIcon = iconExists ? iconPath : undefined;
    
    tray = new Tray(trayIcon || path.join(__dirname, 'angular-app/src/assets', 'icon.ico'));
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Показать',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Скрыть',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Выход',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Домашний Кинотеатр');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка создания иконки в трее:', error);
  }
}

// ========== IPC ОБРАБОТЧИКИ ==========

// Библиотека мультфильмов
ipcMain.handle('get-library', () => {
  return readDB();
});

ipcMain.handle('save-item', (event, item) => {
  console.log('Сохранение элемента:', item);
  const db = readDB();
  
  if (item.id) {
    // Редактирование
    const index = db.findIndex(i => i.id === item.id);
    if (index !== -1) {
      db[index] = {
        ...db[index],
        title: item.title,
        posterPath: item.posterPath,
        playlistPath: item.playlistPath,
        updatedAt: new Date().toISOString()
      };
    }
  } else {
    // Добавление нового
    const newItem = {
      id: crypto.randomUUID(),
      title: item.title,
      posterPath: item.posterPath,
      playlistPath: item.playlistPath,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.push(newItem);
  }
  
  // Сортировка по названию
  db.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  
  const success = writeDB(db);
  console.log('Результат сохранения:', { success, count: db.length });
  return { success, data: db };
});

ipcMain.handle('delete-item', (event, id) => {
  console.log('Удаление элемента:', id);
  const db = readDB();
  const filtered = db.filter(item => item.id !== id);
  const success = writeDB(filtered);
  console.log('Результат удаления:', { success, count: filtered.length });
  return { success, data: filtered };
});

// Выбор файлов
ipcMain.handle('select-file', async (event, options) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options.filters || []
  });
  
  if (canceled || filePaths.length === 0) {
    return null;
  }
  
  return filePaths[0];
});

// Воспроизведение
ipcMain.handle('play-playlist', (event, playlistPath) => {
  // Путь к MPC-HC (настройте под свою систему)
  const MPC_PATH = process.env.MPC_PATH || 
                   'C:\\Program Files (x86)\\K-Lite Codec Pack\\MPC-HC64\\mpc-hc64.exe';
  
  if (!fs.existsSync(MPC_PATH)) {
    return { success: false, error: 'MPC-HC не найден. Установите K-Lite Codec Pack.' };
  }

  if (!fs.existsSync(playlistPath)) {
    return { success: false, error: 'Плейлист не найден' };
  }

  try {
    const { spawn } = require('child_process');
    spawn(MPC_PATH, [playlistPath], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Настройки
ipcMain.handle('get-settings', () => {
  return loadSettings();
});

ipcMain.handle('save-settings', (event, settings) => {
  const success = saveSettings(settings);
  return { success };
});

// Автозапуск (Windows)
ipcMain.handle('set-autostart', async (event, enabled) => {
  if (process.platform !== 'win32') {
    return { success: false, error: 'Только для Windows' };
  }
  
  const { exec } = require('child_process');
  const appPath = app.getPath('exe');
  const appName = 'Домашний Кинотеатр';
  
  return new Promise((resolve) => {
    if (enabled) {
      const command = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "${appPath}" /f`;
      exec(command, (error) => {
        resolve({ success: !error });
      });
    } else {
      const command = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`;
      exec(command, (error) => {
        if (error && error.code === 1) {
          // Ключ уже удален
          resolve({ success: true });
        } else {
          resolve({ success: !error });
        }
      });
    }
  });
});

ipcMain.handle('get-autostart-status', async () => {
  if (process.platform !== 'win32') {
    return false;
  }
  
  const { exec } = require('child_process');
  const appName = 'Домашний Кинотеатр';
  
  return new Promise((resolve) => {
    const command = `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}"`;
    exec(command, (error, stdout) => {
      resolve(!error && stdout.includes(appName));
    });
  });
});

// Управление окном
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return true;
  }
  return false;
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
    return true;
  }
  return false;
});

// ========== ЗАПУСК ПРИЛОЖЕНИЯ ==========

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (tray) {
    tray.destroy();
  }
});