const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        backgroundColor: '#020617',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: isDev ? false : true, // ✨ Disable in dev to allow local API calls
        },
    });

    // Clear cache on startup
    const { session } = require('electron');
    session.defaultSession.clearCache().catch(console.error);

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    const { spawn } = require('child_process');
    const serverPath = path.join(__dirname, '../server/index.js');
    const serverDir = path.join(__dirname, '../server'); // ✨ Set server directory

    serverProcess = spawn('node', [serverPath], {
        cwd: serverDir, // ✨ This ensures dotenv finds the .env file
        env: { ...process.env, NODE_ENV: isDev ? 'development' : 'production' },
        stdio: 'inherit'
    });
}

ipcMain.handle('fetch-nightcafe', async (event, targetUrl) => {
    return new Promise((resolve, reject) => {
        let hiddenWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        let checking = false;

        const timeout = setTimeout(() => {
            if (hiddenWindow) {
                hiddenWindow.close();
                hiddenWindow = null;
            }
            reject(new Error('Timeout fetching NightCafe URL. The service might be protecting against bots too heavily right now.'));
        }, 30000);

        const checkContent = async () => {
            if (!hiddenWindow || checking) return;
            checking = true;
            try {
                const result = await hiddenWindow.webContents.executeJavaScript(`
                    (() => {
                        const script = document.getElementById('__NEXT_DATA__');
                        return script ? script.textContent : null;
                    })();
                `);

                if (result) {
                    const data = JSON.parse(result);
                    const job = data.props?.pageProps?.job;
                    if (job) {
                        clearTimeout(timeout);
                        resolve({
                            title: job.title || '',
                            prompt: job.prompt || '',
                            algorithm: job.algorithm || '',
                            imageUrl: job.result?.url || ''
                        });
                        hiddenWindow.close();
                        hiddenWindow = null;
                        return; // resolved
                    }
                }
            } catch (err) {
                // Ignore script errors during page load
            }
            checking = false;
        };

        hiddenWindow.webContents.on('did-finish-load', () => {
            checkContent();
        });

        // Also check periodically in case did-finish-load fired too early or late
        const interval = setInterval(() => {
            if (hiddenWindow) {
                checkContent();
            } else {
                clearInterval(interval);
            }
        }, 1000);

        hiddenWindow.loadURL(targetUrl, {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }).catch(err => {
            clearTimeout(timeout);
            clearInterval(interval);
            if (hiddenWindow) {
                hiddenWindow.close();
                hiddenWindow = null;
            }
            reject(err);
        });
    });
});

app.whenReady().then(() => {
    startServer();
    setTimeout(() => createWindow(), 1000);
});

app.on('window-all-closed', () => {
    if (serverProcess) serverProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) serverProcess.kill();
});