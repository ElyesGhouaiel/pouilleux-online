# Sprint de finalisation (activité 9)

Dernier sprint avant le rendu du 10/07. L'idée c'était de repasser sur tout le jeu, corriger ce qui coinçait encore et stabiliser le tout pour que ça soit jouable de bout en bout sans mauvaise surprise.

## 1. État des lieux

### Ce qui était déjà terminé et fonctionnel

- Inscription / connexion avec JWT (hash bcrypt des mots de passe)
- Lobby : créer une salle, rejoindre via un code, ajouter des bots
- Moteur de jeu complet : distribution, défausse de paires, pioche chez le voisin, mélange de main
- Phase de préparation de 60s avec bouton "je suis prêt"
- Timer de 30s par tour avec pioche auto si on dépasse
- Bot qui joue tout seul pour compléter les parties
- Assistant IA (Mistral) pour demander conseil pendant la partie
- Bouton abandon + écran de fin + rejouer
- Historique des parties en base
- 33 tests unitaires côté backend

### Ce qu'il restait à finaliser ou corriger

- La distribution des cartes manquait de variété : on tombait souvent sur les mêmes 3 valeurs répétées en 4 couleurs
- Les parties étaient trop courtes : avec 7 cartes et 2 paires en moyenne à défausser, il ne restait que 3 cartes et ça se finissait en 2 tours
- Pas d'indication visuelle claire de "à qui le tour" au centre de l'écran, juste le signal sur le joueur concerné
- L'interface était un peu trop aérée, on ne voyait pas tout d'un coup d'œil

### Problèmes bloquants

Rien de vraiment bloquant à l'entrée du sprint. Le seul vrai souci technique rencontré pendant le sprint a été un crash du backend (le serveur qui tombe, "NetworkError" côté client) — réglé en relançant proprement et en vérifiant que Docker/Postgres tournait bien.

## 2. Priorisation (MoSCoW)

Vu le peu de temps avant le rendu, j'ai classé les tâches comme ça :

| Priorité | Tâche | Pourquoi |
|----------|-------|----------|
| Must | Corriger la variété du deck | Bug de gameplay visible immédiatement, ça cassait l'impression de hasard |
| Must | Rallonger les parties (7 → 9 cartes) | Parties trop expéditives, pas fun |
| Must | Vérifier le rejoindre-une-partie à 2 joueurs | Jamais testé en vrai à 2 postes, risque de bug caché |
| Should | Flèche centrale indiquant le tour | Confort de lecture, on suit mieux la partie |
| Should | Resserrer la mise en page | Rendre l'écran plus lisible |
| Could | Intégrer un skill UI/UX externe | Sympa mais risqué si près de la deadline, laissé de côté |
| Won't | Refaire tout le design | Trop lourd, pas le temps, et l'UI actuelle est utilisable |

## 3. Corrections réalisées pendant le sprint

Une sorte de changelog de ce que j'ai touché :

- **Variété du deck** : avant, pour chaque valeur tirée on prenait direct les 2 paires (les 4 couleurs), donc à 2 joueurs on se retrouvait avec seulement 3 valeurs. Maintenant je fais un premier passage à 1 paire par valeur, et je ne prends une 2e paire que s'il n'y a pas assez de valeurs différentes. Résultat : ~6 valeurs distinctes à 2 joueurs au lieu de 3.
- **Max 9 cartes par joueur** (au lieu de 7). Pour vérifier que ça change bien quelque chose, j'ai fait tourner un petit script qui génère 10 000 mains et compte les paires : on passe d'environ 3 cartes restantes après défausse à environ 5, donc des parties plus longues.
- **Flèche indicateur de tour** : une petite flèche au centre de l'écran qui tourne vers le joueur dont c'est le tour (et pointe vers le bas, en vert, quand c'est à moi).
- **Affichage plus compact** : j'ai réduit les marges et les espaces sur la page de jeu, la zone des adversaires et ma main.
- **Join-room testé à 2 joueurs** : validé en ouvrant 2 onglets (dont un en navigation privée) avec 2 comptes différents. Création + rejoindre + lancement de partie OK, synchro temps réel OK.

Chaque correction a son propre commit sur le repo, avec un message clair.

## 4. Stabilité & tests

### Tests automatiques

33 tests unitaires côté backend (`node:test`), tous au vert :

```bash
cd server
npm test
```

Ils couvrent le deck (création, mélange, détection de paires, préparation avec la nouvelle règle des 9 cartes et la variété), le moteur (distribution, phase de prep, défausse valide/invalide, pioche bloquée hors tour ou pendant la prep, changement de tour, élimination, détection du perdant, protection des mains des autres) et le bot.

### Tests manuels (scénarios rejoués)

| Scénario | Résultat attendu | OK |
|----------|------------------|-----|
| Connexion avec un compte de test | Redirection vers le lobby | oui |
| Créer une salle + ajouter 1 bot + lancer | Passage en phase de prep | oui |
| Rejoindre une salle à 2 joueurs humains | Les 2 se voient dans la liste | oui |
| Défausser une paire pendant la prep | Les 2 cartes disparaissent | oui |
| Cliquer "je suis prêt" | Badge "prêt" affiché | oui |
| Piocher chez le voisin à son tour | Une carte passe dans ma main, le tour change | oui |
| Laisser le timer arriver à 0 | Pioche automatique | oui |
| Abandonner en cours de partie | Compté comme perdant, écran de fin | oui |
| Poser une question à l'assistant IA | Réponse de Mistral dans le chat | oui |
| Terminer une partie + rejouer | Nouvelle partie relancée | oui |

### Bugs rencontrés et corrigés pendant le sprint

- **Backend qui crashe ("NetworkError" côté client)** : le serveur Node était tombé. Relancé proprement, vérifié que le conteneur Postgres tournait bien. Depuis, stable.
- **Deck peu varié** : corrigé (voir section 3).
- **Parties trop rapides** : corrigé en passant à 9 cartes.

## 5. Préparation du playtest

### Scénarios de playtest

1. **Partie solo contre 1 bot** : vérifier tout le cycle prep → tours → fin.
2. **Partie à 2 joueurs humains** : tester la synchro temps réel et le join par code.
3. **Partie à 3-4 joueurs (mix humains + bots)** : vérifier la rotation des tours et l'élimination progressive.
4. **Utilisation de l'assistant IA** en cours de partie pour voir si les conseils sont pertinents.

### Grille d'observation

Pour chaque testeur, noter :

- A-t-il compris le but du jeu sans explication ? (oui / partiellement / non)
- A-t-il trouvé comment défausser une paire ? (oui / non)
- A-t-il compris de qui c'était le tour grâce à la flèche ? (oui / non)
- Y a-t-il eu un bug ou un blocage ? (lequel)
- Ressenti général sur le rythme de la partie (trop lent / bon / trop rapide)

### Métriques simples à suivre

- Durée moyenne d'une partie
- Nombre de crashs / déconnexions pendant le playtest
- Nombre de parties allées jusqu'au bout sans blocage
- Nombre de fois où l'assistant IA a été sollicité

## 6. Lien du repository

Le projet complet, avec l'historique de commits du sprint : [github.com/ElyesGhouaiel/pouilleux-online](https://github.com/ElyesGhouaiel/pouilleux-online)
