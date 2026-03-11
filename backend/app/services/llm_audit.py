import json
import asyncio
import os
from pydantic import BaseModel, Field
from typing import List, Optional

class AuditFiscal(BaseModel):
    statut_conforme: bool = Field(description="True si les données sont cohérentes (bilan équilibré, pas de signes anormaux majeurs), False sinon.")
    erreurs_bloquantes: List[str] = Field(description="Liste des anomalies critiques détectées (ex. déséquilibre du bilan). Vide si aucune.")
    alertes_fiscales: List[str] = Field(description="Liste des points d'attention (comptes débiteurs anormaux, etc.).")

# Singleton pour le modèle chargé en mémoire RAM
_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        try:
            from llama_cpp import Llama
            # Chemin absolu du modèle GGUF dans le dossier /models
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            model_path = os.path.join(base_dir, "models", "qwen2.5-7b-instruct-q4_k_m.gguf")
            
            if not os.path.exists(model_path):
                print(f"[IA Embarquée] Modèle introuvable : {model_path}. Le checkpoint IA sera ignoré.")
                return None
                
            print("[IA Embarquée] Chargement du modèle en RAM (cela peut prendre quelques secondes)...")
            _llm_instance = Llama(
                model_path=model_path,
                n_gpu_layers=-1, # -1 pour VRAM GPU si dispo
                n_ctx=4096,      # Fenêtre de contexte appropriée
                verbose=False    # Pas de logs intempestifs
            )
        except ImportError:
            print("[IA Embarquée] La librairie 'llama-cpp-python' n'est pas installée.")
            return None
    return _llm_instance

def auditer_en_local(aggregated_data: dict) -> AuditFiscal:
    """
    Inférence in-process, CPU-bound.
    """
    model = get_llm()
    if not model:
        # Fallback instantané si le modèle n'est pas présent/chargé
        return AuditFiscal(statut_conforme=True, erreurs_bloquantes=[], alertes_fiscales=["[Info] Validation IA ignorée (Modèle non chargé)."])
        
    resume_balance = json.dumps(aggregated_data, indent=2, ensure_ascii=False)
    
    prompt = f"""<|im_start|>system
Tu es un auditeur financier expert du SYSCOHADA.
Ta mission est de vérifier le résumé de la balance comptable.
Vérifie l'équilibre financier (Total Actif proche de Total Passif, marge de 1 FCFA).
Vérifie la présence d'un résultat cohérent.
<|im_end|>
<|im_start|>user
{resume_balance}<|im_end|>
<|im_start|>assistant
"""
    
    # Inférence contrainte par le schéma Pydantic (Function Calling natif)
    response = model.create_chat_completion(
        messages=[
            {"role": "system", "content": "Tu es un auditeur certifié. Réponds exclusivement au format JSON strict."},
            {"role": "user", "content": f"Analyse cette donnée : {resume_balance}"}
        ],
        response_format={
            "type": "json_object",
            "schema": AuditFiscal.model_json_schema()
        },
        temperature=0.1
    )
    
    resultat_json = response["choices"][0]["message"]["content"]
    data = json.loads(resultat_json)
    return AuditFiscal(**data)

async def valider_coherence_ia_async(aggregated_data: dict) -> AuditFiscal:
    """
    Lancera l'inférence bloquante dans un nouveau thread pour ne pas paralyser FastAPI.
    """
    return await asyncio.to_thread(auditer_en_local, aggregated_data)
