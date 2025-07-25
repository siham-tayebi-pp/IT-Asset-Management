import csv
import requests
import os
import uuid # Pour générer des numéros de série uniques si non fournis

# --- Configuration GLPI (lue depuis les variables d'environnement) ---
# Assurez-vous que ces variables sont définies dans votre environnement (par exemple, via .env.local)
GLPI_API_BASE_URL = os.getenv("GLPI_API_URL")
GLPI_APP_TOKEN = os.getenv("GLPI_APP_TOKEN")
GLPI_USER_TOKEN = os.getenv("GLPI_USER_TOKEN")

# --- Chemin vers votre fichier CSV ---
CSV_FILE_PATH = "data/pcs.csv" # Assurez-vous que ce chemin est correct

# --- Fonction pour créer un ordinateur dans GLPI ---
def create_glpi_computer(computer_data):
    headers = {
        "Content-Type": "application/json",
        "App-Token": GLPI_APP_TOKEN,
        "Authorization": f"user_token {GLPI_USER_TOKEN}"
    }
    
    # Construire le payload pour l'API GLPI
    payload = {
        "input": {
            "name": computer_data["name"],
            "serial": computer_data.get("serial", str(uuid.uuid4())), # Utilise le serial du CSV ou en génère un
            "comment": (
                f"Propriétaire: {computer_data.get('owner', 'N/A')}\n"
                f"Département: {computer_data.get('department', 'N/A')}\n"
                f"Statut: {computer_data.get('status', 'N/A')}\n"
                f"RAM: {computer_data.get('ram', 'N/A')}\n"
                f"CPU: {computer_data.get('cpu', 'N/A')}\n"
                f"OS: {computer_data.get('os', 'N/A')}\n"
                f"Dernière activité: {computer_data.get('lastActivity', 'N/A')}"
            ),
        }
    }

    try:
        # L'URL de base de l'API GLPI est déjà fournie avec /apirest.php
        # Nous ajoutons simplement l'endpoint spécifique (ex: /Computer)
        api_endpoint = f"{GLPI_API_BASE_URL}/Computer"
        response = requests.post(api_endpoint, headers=headers, json=payload)
        response.raise_for_status()  # Lève une exception pour les codes d'état HTTP d'erreur (4xx ou 5xx)
        print(f"PC '{computer_data['name']}' importé avec succès. ID GLPI: {response.json()['id']}")
    except requests.exceptions.HTTPError as e:
        print(f"Erreur HTTP lors de l'importation de '{computer_data['name']}': {e}")
        print(f"Réponse GLPI: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion lors de l'importation de '{computer_data['name']}': {e}")

# --- Fonction principale ---
def main():
    if not all([GLPI_API_BASE_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN]):
        print("Erreur: Veuillez vous assurer que GLPI_API_URL, GLPI_APP_TOKEN et GLPI_USER_TOKEN sont définis dans vos variables d'environnement.")
        print("Ces variables sont généralement chargées automatiquement si vous utilisez un fichier .env.local avec un outil comme `dotenv` ou si votre environnement de déploiement les fournit.")
        return

    try:
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                create_glpi_computer(row)
    except FileNotFoundError:
        print(f"Erreur: Le fichier CSV '{CSV_FILE_PATH}' est introuvable. Assurez-vous qu'il est dans le bon répertoire.")
    except Exception as e:
        print(f"Une erreur inattendue est survenue: {e}")

if __name__ == "__main__":
    main()
