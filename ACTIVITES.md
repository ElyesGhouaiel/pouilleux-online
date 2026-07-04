# Correspondance activités → livrables

Le projet regroupe le travail de plusieurs activités du module. Voici où retrouver quoi.

## Activité 1 - Architecture globale
Note d'intention et vision d'ensemble : première partie du [`dossier-cadrage.md`](dossier-cadrage.md) (sections 1.1 à 1.3).

- Nom du projet, description, problème résolu, cible
- Arborescence de navigation
- Wireframes des écrans clés

## Activité 2 - MCD & MLD
Modélisation de la base : [`dossier-cadrage.md`](dossier-cadrage.md) section 2.

- MCD → schéma `docs/mcd-pouilleux.png`
- MLD → schéma `docs/mld-pouilleux.png` + tables en détail
- MPD → script SQL exécutable

## Activité 3 - Routes API REST
Backend Express avec routes REST : dossier [`server/`](server/).

- Fichiers : `server/index.js`, `server/routes/auth.js`, `server/routes/joueur.js`, `server/routes/ai.js`
- ORM : Prisma (`server/prisma/schema.prisma`)
- Endpoints : `POST /api/register`, `POST /api/login`, `GET /api/me`, `GET /api/history`, `POST /api/ai/chat`

## Activité 4 - Lot fonctionnel + dossier de cadrage
Dossier de cadrage complet : [`dossier-cadrage.md`](dossier-cadrage.md).

Feature end-to-end : création de compte + connexion opérationnelle depuis le frontend.

- Front : `client/src/pages/Register.jsx`, `client/src/pages/Login.jsx`, `client/src/contexts/AuthContext.jsx`
- Back : `server/routes/auth.js` avec hash bcrypt + JWT

## Activité 5 - Sécurisation & adaptation
JWT + middleware d'authentification.

- Middleware : `server/middleware/auth.js`
- Routes protégées : `/api/me`, `/api/history`, `/api/ai/chat` (dans les fichiers de routes du dossier `server/routes/`)
- Frontend : stockage du token dans le localStorage, envoi via header `Authorization: Bearer`, redirection auto si token invalide (`client/src/contexts/AuthContext.jsx`)

## Activité 6 - Flux de données
Le jeu multijoueur temps réel : lobby, salle, actions de jeu, synchro entre joueurs.

- Backend Socket.io : `server/sockets/index.js`
- Moteur de jeu : `server/game/Engine.js`, `server/game/Deck.js`, `server/game/Bot.js`
- Frontend : `client/src/pages/Lobby.jsx`, `client/src/pages/Game.jsx`, `client/src/contexts/SocketContext.jsx`
- Événements clés : `create-room`, `join-room`, `start-game`, `player-ready`, `discard-pair`, `draw-card`, `shuffle-hand`, `leave-game`

## Activités 7 et 8 - Implémentation & optimisation
Le code est structuré en modules cohérents, gère les erreurs (retours JSON avec `error`), sans secret en dur, avec des choix techniques cohérents (JWT stateless, WebSockets pour le temps réel, phase de préparation pour améliorer le rythme du jeu).

## Activité 9 - Finalisation & analyse critique
- [`README.md`](README.md) : installation, utilisation, fonctionnalités, limites et pistes d'amélioration
- Section "Analyse critique" du README pour le recul sur le projet

## Fonctionnalité IA
Assistant conversationnel intégré au jeu, propulsé par Mistral AI.

- Backend : `server/routes/ai.js` (route `POST /api/ai/chat` protégée par JWT)
- Frontend : `client/src/components/AiAssistant.jsx` (bouton flottant + panneau chat)
- Détails dans [`dossier-cadrage.md`](dossier-cadrage.md) section 4
