import { fetchAPI } from "./api";

/**
 * SyncEngine gère la logique de synchronisation entre l'instance locale (EXE)
 * et l'instance Cloud (SaaS).
 */
export const SyncEngine = {
  /**
   * Vérifie si le serveur central est atteignable
   */
  async checkCloudStatus(): Promise<boolean> {
    try {
      // On teste un endpoint simple sur le cloud
      const response = await fetch(process.env.NEXT_PUBLIC_CLOUD_URL + "/health", { method: 'HEAD', timeout: 2000 } as any);
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Lance une synchronisation complète
   */
  async performFullSync() {
    console.log("Démarrage de la synchronisation hybride...");
    
    try {
      // 1. Collecter les données locales
      const localData = await fetchAPI("/sync/export");
      
      // 2. Envoyer au Cloud
      const cloudUrl = process.env.NEXT_PUBLIC_CLOUD_URL;
      if (!cloudUrl) throw new Error("URL Cloud non configurée");

      const response = await fetch(`${cloudUrl}/sync/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(localData)
      });

      if (!response.ok) throw new Error("Échec de l'envoi vers le cloud");

      // 3. Marquer le succès
      const now = new Date().toISOString();
      localStorage.setItem("last_sync_timestamp", now);
      
      return { success: true, timestamp: now };
    } catch (error) {
      console.error("Erreur Sync:", error);
      return { success: false, error };
    }
  }
};
