const { app, BrowserWindow } = require('electron');
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