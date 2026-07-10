# Le Pouilleux

Jeu de cartes en ligne multijoueur (2 à 4 joueurs) inspiré du classique "Pouilleux" (aussi appelé Old Maid). On peut jouer entre potes en temps réel, ou contre des bots si on est pas assez.

Projet fait pour le module **Coordination dev Front & Back** (M2 Dev fullstack, Ynov Connect).

Voir aussi :
- [`dossier-cadrage.md`](dossier-cadrage.md) : le document de cadrage complet
- [`ACTIVITES.md`](ACTIVITES.md) : où retrouver chaque activité du module
- [`sprint-finalisation.md`](sprint-finalisation.md) : compte rendu du sprint de finalisation (activité 9)
- [`analyse-critique.md`](analyse-critique.md) : analyse critique et feuille de route (activité 10)

## But du jeu

- Un joueur reçoit un as en moins que les autres au démarrage → il reste une seule carte "solo" dans le paquet, c'est le **pouilleux**
- Chaque joueur défausse ses paires (2 cartes de même valeur) puis pioche à son tour une carte face cachée chez son voisin
- Celui qui reste avec le pouilleux à la fin **perd**

## Prérequis

- Node.js 18 ou plus
- Docker (pour la base de données PostgreSQL en local)

## Lancer le projet

### 1. Base de données

Depuis le dossier `server/` :

```bash
docker compose up -d
```

Ça démarre un conteneur PostgreSQL sur le port `5433` (j'ai pris ce port pour éviter un conflit avec une install locale de Postgres sur 5432).

### 2. Backend

Toujours dans `server/` :

```bash
cp .env.example .env
npm install
npx prisma migrate dev
node prisma/seed.js
node index.js
```

Serveur sur [http://localhost:3000](http://localhost:3000).

Pour l'assistant IA il faut une clé Mistral (gratuit sur [console.mistral.ai](https://console.mistral.ai)). Une fois récupérée, la mettre dans `.env` :

```
MISTRAL_API_KEY=ta-cle-ici
```

Sans cette clé le jeu marche quand même, seul le bouton ampoule (chat IA) renvoie une erreur.

### 3. Frontend

Dans `client/` :

```bash
npm install
npm run dev
```

Accessible sur [http://localhost:5173](http://localhost:5173).

## Comptes de test

Le script `seed.js` crée 3 comptes :

- alice@test.com / test1234
- bob@test.com / test1234
- charlie@test.com / test1234

Ils sont aussi affichés sur la page de connexion (clic pour auto-remplir).

## Tests

Suite de tests unitaires côté backend (33 tests) :

```bash
cd server
npm test
```

Ça teste le moteur de jeu (`Deck`, `Engine`), le bot, et les cas limites (défausse invalide, pioche hors tour, phase de préparation, élimination, etc.).

## Fonctionnalités

Ce qui marche :

- Inscription + connexion avec JWT
- Création / rejoindre une salle via code partagé
- Ajout de bots dans la salle (par l'hôte)
- Distribution des cartes (max 9 par joueur)
- Phase de préparation (60s) pour défausser les paires initiales, avec bouton "je suis prêt"
- Tours normaux : pioche chez le voisin, mélange de main, défausse de paires
- Timer 30s par tour (pioche auto si timeout)
- Bot joueur (algorithmique, joue tout seul)
- Assistant IA conversationnel (Mistral) pour demander conseil pendant la partie
- Bouton abandon (compté comme défaite)
- Écran de fin + bouton rejouer
- Historique des parties en base

## Architecture

```
├── client/                     Frontend React (Vite)
│   ├── src/
│   │   ├── pages/              Login, Register, Lobby, Game
│   │   ├── contexts/           Auth + Socket contexts
│   │   ├── components/         Card, AiAssistant
│   │   └── index.css           Styles globaux
│   └── vite.config.js
├── server/                     Backend Node + Express
│   ├── routes/                 auth, joueur (protégée), ai (protégée)
│   ├── middleware/             auth.js (vérif JWT)
│   ├── game/                   Deck, Engine, Bot (logique jeu)
│   ├── sockets/                index.js (Socket.io + rooms)
│   ├── prisma/                 schema + seed
│   ├── tests/                  33 tests unitaires
│   └── docker-compose.yml      Postgres
├── docs/                       Schémas MCD / MLD
├── dossier-cadrage.md          Doc de cadrage complète
├── ACTIVITES.md                Mapping activités → fichiers
└── README.md
```

Flux général :

1. Client se connecte via `POST /api/login`, reçoit un JWT
2. Client ouvre une connexion Socket.io en envoyant le JWT en handshake
3. Serveur vérifie le JWT et associe le socket à l'utilisateur
4. Toutes les actions de jeu (créer salle, jouer une carte...) passent par des events Socket.io
5. Le serveur maintient l'état du jeu en mémoire (dans `GameEngine`), diffuse les updates dans la salle
6. En fin de partie, la partie est enregistrée en base pour l'historique

## Stack

- **Frontend** : React 18, Vite, React Router v7, socket.io-client
- **Backend** : Node.js, Express 5, Socket.io 4, Prisma 6, jsonwebtoken, bcryptjs
- **Base** : PostgreSQL 16 (Docker)
- **IA** : Mistral AI (modèle `mistral-small-latest`, via API REST)
- **Tests** : `node:test` (natif à Node 20+)

Détails et justifications dans [`dossier-cadrage.md`](dossier-cadrage.md) section 3.

## Analyse critique

### Ce qui a bien marché

- Le choix de Socket.io simplifie énormément le temps réel, pas besoin de gérer manuellement les reconnexions ou le fallback
- Prisma m'a évité pas mal de bugs (typage des queries, migrations auto)
- La phase de préparation ajoutée en fin de projet rend le jeu beaucoup plus agréable (au début tout le monde était noyé sous les cartes)

### Limites actuelles

- Pas de persistance de l'état d'une partie : si le serveur redémarre en pleine partie, tout est perdu. C'est un choix assumé (les parties sont courtes) mais faudrait le gérer pour un vrai déploiement
- Pas de reconnexion propre : si un joueur perd sa connexion, le socket se ferme et il ne peut pas revenir dans la salle
- Le bot est bête : il défausse ses paires et pioche au hasard, mais c'est optimal au Pouilleux donc pas grave
- L'IA (Mistral) coûte des tokens à chaque question, à voir si on rate-limit par utilisateur pour éviter les abus
- Pas de tests côté frontend (juste le backend)
- Pas de CI/CD (le prof a précisé que c'était hors périmètre)

### Pistes d'amélioration

- Persister l'état de partie en base (ou Redis) pour survivre à un redémarrage serveur
- Reconnexion : au refresh du navigateur, retrouver sa salle et son état
- Animations sur les cartes (transitions CSS, quand on pioche, quand on défausse)
- Effets sonores légers
- Leaderboard basé sur l'historique des parties
- Version mobile (le CSS n'est pas terrible sur petits écrans)
- Tests E2E avec Playwright
- Bot avec plusieurs "personnalités" (agressif, prudent) juste pour le fun
