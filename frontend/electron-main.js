const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  console.log("Démarrage du moteur local...");
  // Chemin vers le binaire python (à adapter lors du packaging final)
  const pythonPath = process.platform === 'win32' ? 'backend/venv/Scripts/python.exe' : 'python3';
  
  backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'], {
    cwd: path.join(__dirname, '../backend')
  });

  backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
  backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Auditia Hybride",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Mode Hybride : On tente le Cloud, sinon on charge le Local
  mainWindow.loadURL('http://localhost:3000/login'); 

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (backendProcess) backendProcess.kill();
  });
}

app.whenReady().then(() => {
  // startBackend(); // On l'activera lors du packaging final
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
