# Configuration GLPI pour l'intégration

## 1. Activer l'API REST dans GLPI

### Via l'interface GLPI :
1. Connectez-vous en tant qu'administrateur
2. Allez dans **Configuration** > **Générale**
3. Onglet **API**
4. Cochez **Activer l'API REST**
5. Définir l'URL de base : `http://votre-serveur/apirest.php`
6. Sauvegarder

### Via la base de données (si nécessaire) :
\`\`\`sql
UPDATE glpi_configs SET value = 1 WHERE name = 'enable_api';
UPDATE glpi_configs SET value = 1 WHERE name = 'enable_api_login_credentials';
UPDATE glpi_configs SET value = 1 WHERE name = 'enable_api_login_external_token';
\`\`\`

## 2. Créer un App Token

1. Dans GLPI : **Configuration** > **Générale** > **API**
2. Section **Clients API**
3. Cliquer sur **Ajouter**
4. Nom : "PC Management System"
5. Actif : Oui
6. Adresse IP : Votre serveur web (ou 0.0.0.0/0 pour test)
7. Copier le **App Token** généré

## 3. Créer un User Token

1. Aller dans **Administration** > **Utilisateurs**
2. Sélectionner un utilisateur avec les droits appropriés
3. Onglet **Paramètres personnels**
4. Section **Tokens d'API**
5. Cliquer sur **Générer**
6. Copier le **User Token**

## 4. Tester l'API

\`\`\`bash
curl -X POST \
  'http://192.168.0.58/glpi/apirest.php/initSession' \
  -H 'Content-Type: application/json' \
  -H 'App-Token: ow3eeLBLEpnrS7hHN0S04a7617VMqGtYCUH9AceL' \
  -d '{
    "login": "glpi",
    "password": "Wyuw6089?"
  }'
//exp
✦ Okay, I understand. You want to generate a PDF within the application that explains each page's function.


  Here's my plan:
   1. Identify Pages: List files in app/ to find all pages.
   2. Extract Descriptions: Read page.tsx files for each page to understand its purpose.
   3. Select PDF Library: Check package.json for existing PDF libraries or suggest a new one.
   4. Generate PDF: Write code to create the PDF with page explanations.
   5. Integrate: Create an endpoint or component to trigger PDF generation and download.


  I'll start by listing the contents of the app/ directory to identify the pages.
 ╭───────────────────────────────────────────────────────────────────────────────────────────────────╮
 │ ✔  ReadFolder app                                                                                 │
 │                                                                                                   │
 │    Listed 12 item(s).                                                                             │
 ╰───────────────────────────────────────────────────────────────────────────────────────────────────╯
✦ Okay, I've identified these potential pages: app/page.tsx, app/assignments/page.tsx, app/dashboard/page.tsx,
   app/inventory/page.tsx, app/managers/page.tsx, app/setup-glpi/page.tsx, app/test-glpi/page.tsx,
  app/user-dashboard/page.tsx, and app/users/page.tsx. I'll now read app/page.tsx to understand its function.
 ╭───────────────────────────╮
 │ ✔  ReadFile app\page.tsx  │
 ╰───────────────────────────╯
✦ app/page.tsx is the Login Page, authenticating users via GLPI credentials and redirecting admins to
  /dashboard or users to /user-dashboard. It includes test accounts and a GLPI setup link. Next, I'll examine
  app/assignments/page.tsx.
 ╭───────────────────────────────────────╮
 │ ✔  ReadFile app\assignments\page.tsx  │
 ╰───────────────────────────────────────╯
✦ app/assignments/page.tsx is the Assignments Management Page, displaying PC assignments with search,
  download, and new assignment options. It also provides navigation to Dashboard, Users, Inventory, and
  Managers. Now, I'll read app/dashboard/page.tsx.
 ╭─────────────────────────────────────╮
 │ ✔  ReadFile app\dashboard\page.tsx  │
 ╰─────────────────────────────────────╯
✦ app/dashboard/page.tsx is the Admin Dashboard / PC Management Page. It offers an overview of all PCs,
  categorized by status (Assigned, Unassigned, Delegated, On Leave), with statistics and a searchable,
  filterable list displaying PC details. This page is for administrators. Now, I'll read
  app/inventory/page.tsx.
 ╭─────────────────────────────────────╮
 │ ✔  ReadFile app\inventory\page.tsx  │
 ╰─────────────────────────────────────╯
✦ app/inventory/page.tsx is the Inventory Management Page, displaying IT asset details like type, brand,
  model, serial number, status, condition, reception date, and quantity. It supports searching and adding new
  items, and includes standard navigation. Now, I'll read app/managers/page.tsx.
 ╭────────────────────────────────────╮
 │ ✔  ReadFile app\managers\page.tsx  │
 ╰────────────────────────────────────╯
✦ app/managers/page.tsx is the Managers Management Page, displaying manager details and offering add, edit,
  and delete functionalities, alongside standard navigation. Now, I'll read app/setup-glpi/page.tsx.
 ╭──────────────────────────────────────╮
 │ ✔  ReadFile app\setup-glpi\page.tsx  │
 ╰──────────────────────────────────────╯
✦ app/setup-glpi/page.tsx is the GLPI Cloud Setup Page, guiding users through GLPI API configuration,
  including token creation and environment variable setup. It features "Test Connection" and "Troubleshoot"
  tabs. Now, I'll read app/test-glpi/page.tsx.
 ╭─────────────────────────────────────╮
 │ ✔  ReadFile app\test-glpi\page.tsx  │
 ╰─────────────────────────────────────╯
✦ app/test-glpi/page.tsx is the GLPI Connection Test Page. It offers a dedicated interface to test GLPI server
   connectivity, displaying success/failure, retrieved data (computer/profile counts, samples), and missing
  configurations. It's a focused version of app/setup-glpi/page.tsx's "Test de connexion" tab. Now, I'll read
  app/user-dashboard/page.tsx.
 ╭──────────────────────────────────────────╮
 │ ✔  ReadFile app\user-dashboard\page.tsx  │
 ╰──────────────────────────────────────────╯
✦ app/user-dashboard/page.tsx is the User Dashboard Page. It displays user and assigned PC details from GLPI,
  including user name, GLPI username, comments, PC name, status, and last inventory update. Hardware
  configuration is currently example data. A logout button is also present. Now, I'll read app/users/page.tsx.
 ╭─────────────────────────────────╮
 │ ✔  ReadFile app\users\page.tsx  │
 ╰─────────────────────────────────╯
✦ I've analyzed each page: / (Login), /assignments (PC Assignments), /dashboard (Admin PC Management),
  /inventory (IT Asset Management), /managers (Manager Account Management), /setup-glpi (GLPI API Setup),
  /test-glpi (GLPI API Test), /user-dashboard (User PC/Info Display), and /users (User Account Management).
  Next, I'll check package.json for a PDF library.
 ╭───────────────────────────╮
 │ ✔  ReadFile package.json  │
