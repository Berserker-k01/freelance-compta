const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;

/**
 * Démarre le moteur local (Python FastAPI)
 */
function startBackend() {
    console.log("Initialisation du moteur hybride...");
    
    // Tentative de localisation du binaire Python
    // En production (EXE), on cherchera dans un dossier 'resources'
    let pythonPath = 'python'; // Par défaut si présent dans le PATH
    let scriptPath = path.join(__dirname, '..', 'backend', 'app', 'main.py');
    
    if (!app.isPackaged) {
        // Mode développement
        pythonPath = process.platform === 'win32' ? '../backend/venv/Scripts/python.exe' : 'python3';
        scriptPath = path.join(__dirname, '..', 'backend', 'app', 'main.py');
    } else {
        // Mode EXE Packagé
        // On suppose que le backend est copié dans le dossier des ressources de l'app
        pythonPath = path.join(process.resourcesPath, 'backend_engine', 'python.exe');
        scriptPath = path.join(process.resourcesPath, 'backend_engine', 'app', 'main.py');
    }

    try {
        backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001'], {
            cwd: path.dirname(path.dirname(scriptPath)),
            env: { ...process.env, DATABASE_URL: 'sqlite:///./auditia_local.db' } // Utilisation de SQLite en local
        });

        backendProcess.stdout.on('data', (data) => console.log(`[Backend]: ${data}`));
        backendProcess.stderr.on('data', (data) => console.error(`[Backend Error]: ${data}`));
        
        backendProcess.on('error', (err) => {
            console.error("Impossible de démarrer le moteur local:", err);
        });
    } catch (e) {
        console.error("Exception lors du démarrage du moteur:", e);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Auditia - Expert Comptable (Mode Hybride)",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // MODE HYBRIDE :
    // 1. Tente de charger la version SaaS (Online)
    // 2. Si échec ou timeout, bascule sur la version locale de l'EXE
    
    const CLOUD_URL = 'http://localhost:3000/login'; // À remplacer par votre URL VPS réelle
    
    mainWindow.loadURL(CLOUD_URL).catch(() => {
        console.warn("Mode Offline détecté ou serveur Cloud injoignable. Basculement sur le moteur local...");
        mainWindow.loadURL('http://localhost:8001/doc'); // Ou une page spécifique de l'app servie en local
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (backendProcess) {
            console.log("Arrêt du moteur local...");
            backendProcess.kill();
        }
    });
}

app.whenReady().then(() => {
    // startBackend(); // Optionnel: ne démarrer que si nécessaire
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
