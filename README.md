# 🎓 QCM Platform

Plateforme d'examens QCM en ligne — React + Node.js/Express + MySQL

---

## 🏗️ Architecture

```
qcm-platform/
├── backend/          # Node.js + Express + MySQL
│   ├── server.js     # Point d'entrée
│   ├── db.js         # Pool de connexion MySQL
│   ├── schema.sql    # Schéma de base de données
│   ├── middleware/
│   │   └── auth.js   # Middleware JWT
│   └── routes/
│       ├── auth.js       # Inscription / Connexion
│       ├── exams.js      # CRUD examens + export Excel
│       ├── questions.js  # CRUD questions + upload médias
│       └── candidate.js  # Passage de l'examen
└── frontend/         # React + Vite
    └── src/
        └── App.jsx   # Application complète (SPA)
```

---

## ⚡ Installation

### Prérequis
- Node.js 18+
- MySQL 8+
- npm

### 1. Base de données
```bash
mysql -u root -p < backend/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Modifier .env avec vos paramètres MySQL
npm run dev
# Serveur sur http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# App sur http://localhost:3000
```

---

## 🔑 Variables d'environnement (backend/.env)

| Variable | Description | Défaut |
|----------|-------------|--------|
| PORT | Port du serveur | 5000 |
| DB_HOST | Hôte MySQL | localhost |
| DB_PORT | Port MySQL | 3306 |
| DB_USER | Utilisateur MySQL | root |
| DB_PASSWORD | Mot de passe MySQL | — |
| DB_NAME | Nom de la base | qcm_platform |
| JWT_SECRET | Clé secrète JWT | **À changer !** |
| UPLOAD_DIR | Dossier uploads | uploads |

---

## 🚀 Fonctionnalités

### Espace Candidat
- ✅ Identification : email, nom, prénom, code Apogée
- ✅ Page de consignes avec bouton START
- ✅ Jauge de temps par question (configurable)
- ✅ Support image, vidéo, audio dans les questions
- ✅ Score affiché sur 100 à la fin
- ✅ Impossible de passer l'examen deux fois (par code Apogée)
- ✅ Perte de focus → réponse comptée fausse automatiquement
- ✅ Géolocalisation obligatoire (configurable par examen)

### Espace Professeur
- ✅ Création de compte + authentification JWT
- ✅ Créer, modifier, supprimer des examens
- ✅ Ajouter/modifier/supprimer des questions
- ✅ Upload de médias (image, vidéo, audio)
- ✅ Tableau de résultats avec scores, localisation GPS
- ✅ Export Excel des résultats
- ✅ Statistiques : score moyen, nb de passages

---

## 📡 API Endpoints

### Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/auth/register | Inscription professeur |
| POST | /api/auth/login | Connexion |

### Examens (authentifié)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/exams | Liste des examens |
| POST | /api/exams | Créer un examen |
| PUT | /api/exams/:id | Modifier un examen |
| DELETE | /api/exams/:id | Supprimer un examen |
| GET | /api/exams/:id/candidates | Résultats candidats |
| GET | /api/exams/:id/export | Export Excel |

### Questions (authentifié)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/exams/:id/questions | Liste des questions |
| POST | /api/exams/:id/questions | Créer une question |
| PUT | /api/exams/:id/questions/:qid | Modifier |
| DELETE | /api/exams/:id/questions/:qid | Supprimer |

### Candidat (public)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/candidate/exam/:id | Infos examen (sans réponses) |
| POST | /api/candidate/register | Enregistrer candidat |
| POST | /api/candidate/answer | Soumettre une réponse |
| POST | /api/candidate/finish | Terminer + calculer score |

---

## 🔒 Sécurité

- Mots de passe hashés avec **bcrypt** (salt rounds: 10)
- Authentification par **JWT** (expire en 24h)
- Les bonnes réponses ne sont **jamais exposées** au frontend candidat
- Anti-triche : perte de focus = réponse fausse
- Anti-rejeu : vérification unicité par (exam_id + apogee_code)
- Upload limité à **50 MB** par fichier

---

## 📊 Modèle de données

```
users ──< exams ──< questions ──< choices
                ──< candidates ──< candidate_answers
```
