# Analyse critique du projet (activité 10)

Petit recul sur le projet une fois arrivé au bout : ce qui marche bien, ce qui est perfectible, ce que le module m'a apporté, et ce que je ferais si je continuais après le rendu.

## 1. Points forts

- **Le temps réel marche bien.** Socket.io gère la synchro entre les joueurs et j'ai pas eu à coder moi-même toute la partie compliquée des connexions. Quand quelqu'un défausse ou pioche, les autres le voient tout de suite.
- **Le front et le back sont bien séparés.** Toute la logique du jeu est côté serveur, le front ne fait qu'afficher. Du coup un joueur peut pas tricher en bidouillant son navigateur, vu que c'est le serveur qui décide de tout.
- **La sécurité est là.** Les mots de passe sont hashés avec bcrypt, les routes importantes sont protégées par le JWT, et le token est aussi vérifié quand le joueur ouvre sa connexion socket.
- **Il y a des tests.** 33 tests unitaires sur la logique de jeu. Ça m'a bien aidé : j'ai pu modifier du code sans avoir peur de tout casser (par exemple quand j'ai changé la distribution des cartes).
- **Une vraie fonctionnalité IA.** L'assistant Mistral est vraiment branché sur l'API, c'est pas juste un faux truc codé en dur : il reçoit ce qui se passe dans la partie et répond pour de vrai.
- **La phase de préparation** que j'ai ajoutée vers la fin rend le jeu beaucoup plus agréable qu'au début.

## 2. Points faibles

- **Les parties ne sont pas sauvegardées.** Tout se passe dans la mémoire du serveur. Si le serveur redémarre pendant une partie, elle est perdue. Comme les parties sont courtes ça va, mais ça reste une vraie limite.
- **Pas de reconnexion propre.** Si un joueur rafraîchit sa page ou perd sa connexion, il ne retrouve pas sa salle ni sa partie.
- **Rien qui limite l'usage de l'IA.** Chaque question à Mistral consomme des tokens (donc ça peut coûter de l'argent), et pour l'instant rien n'empêche un joueur d'envoyer 50 messages d'affilée.
- **Pas de tests côté frontend.** J'ai testé seulement le backend.
- **Le CSS n'est pas responsive.** Sur ordinateur ça va, mais sur téléphone la mise en page est pas adaptée.
- **L'état des parties est gardé en mémoire du serveur** (dans une simple variable). Si un jour il fallait faire tourner le jeu sur plusieurs serveurs en même temps, ça marcherait pas comme ça. Pour un projet d'école c'est largement suffisant, mais c'est bon à savoir.

## 3. Parties que je pourrais refactoriser (nettoyer)

- **`server/sockets/index.js`** est le fichier le plus gros : il fait un peu tout (les salles, le déroulement de la partie, les timers, l'envoi des mises à jour). Je pense qu'il faudrait le couper en plusieurs fichiers plus petits, ça serait plus clair.
- **Les timers** (celui de la préparation et celui de chaque tour) sont gérés un peu partout avec des `setInterval`. Ça serait mieux de tout regrouper au même endroit.
- **`Game.jsx`** (côté front) commence à être long. Je pourrais le découper en plus petits morceaux (la zone des adversaires, la barre du haut, ma main) pour m'y retrouver plus facilement.
- **Les messages d'erreur** sont écrits directement dans le code un peu partout. Les mettre tous au même endroit serait plus propre.

## 4. Apports du module pour le projet

Avant le module, je voyais tous ces sujets un peu séparément. Là j'ai pu les relier ensemble sur un vrai projet :

- **Coordination front / back** : bien définir qui fait quoi entre le front et le back. Ici j'ai choisi que le serveur décide de tout et que le client se contente d'afficher.
- **API REST** : faire des routes correctes avec les bons verbes (GET, POST...) et les bons codes HTTP, et bien gérer les erreurs (renvoyer un JSON avec un champ `error`).
- **Sécurisation JWT** : comprendre tout le parcours (login → on reçoit un token → on le vérifie à chaque requête), et surtout pourquoi on stocke jamais un mot de passe en clair.
- **Modélisation** : faire le MCD / MLD avant de coder la base avec Prisma. Ça m'a évité de bricoler le schéma au dernier moment.
- **Temps réel** : découvrir les WebSockets, qui marchent différemment des requêtes classiques (le serveur peut envoyer des choses au client tout seul, sans qu'on lui demande à chaque fois).
- **Intégration d'une IA** : appeler l'API d'un modèle externe, lui donner le contexte de la partie, et penser au cas où la clé API n'est pas configurée.

## 5. Feuille de route "post-module"

### Risques identifiés

| Risque | Type | Impact | Probabilité |
|--------|------|--------|-------------|
| Perte de partie si le serveur redémarre | Technique | Moyen | Faible (parties courtes) |
| Joueur déconnecté ne peut pas revenir | Fonctionnel | Moyen | Moyen |
| Abus de l'assistant IA (coût tokens) | Technique / coût | Faible | Moyen |
| CSS non responsive → inutilisable sur mobile | Fonctionnel | Moyen | Élevé si usage mobile |
| Fichier socket trop gros → difficile à maintenir | Technique (dette) | Faible | Moyen |

### Plan d'action priorisé

| Priorité | Action | Objectif |
|----------|--------|----------|
| Must | Ajouter la reconnexion (retrouver sa salle au refresh) | Éviter de perdre les joueurs en cours de partie |
| Must | Rate-limiter l'appel IA par utilisateur | Maîtriser le coût et éviter les abus |
| Should | Persister l'état de partie (Redis ou base) | Survivre à un redémarrage serveur |
| Should | Découper `sockets/index.js` et extraire les timers | Réduire la dette technique |
| Should | Rendre le CSS responsive | Rendre le jeu jouable sur mobile |
| Could | Ajouter des tests E2E (Playwright) | Sécuriser les parcours utilisateur |
| Could | Animations de cartes + effets sonores | Améliorer le ressenti |
| Won't (pour l'instant) | Leaderboard, personnalités de bots | Sympa mais non prioritaire |

## 6. Ce que j'ai déjà fait en priorité pour le rendu

Dans cette feuille de route, j'ai déjà traité quelques trucs pendant le sprint de finalisation pour être sûr que le projet soit bon le jour du rendu :

- Corrigé le bug de variété des cartes (le gameplay)
- Rallongé les parties (9 cartes) parce qu'elles étaient trop courtes
- Ajouté la flèche qui montre à qui c'est le tour + resserré l'affichage pour que ça soit plus lisible
- Testé le jeu à 2 vrais joueurs (je l'avais jamais fait avant)
- Nettoyé le dépôt : `.gitignore` correct, pas de mot de passe / clé dans le code, commits lisibles

Le reste (reconnexion, sauvegarde des parties, responsive mobile, limite sur l'IA) c'est vraiment du travail pour plus tard, après le module.
