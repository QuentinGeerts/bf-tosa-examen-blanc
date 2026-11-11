# Examen blanc - Développement web

Simulation de l'examen de certification (HTML, CSS, JavaScript, Intégration) pour la formation Bruxelles Formation.

- 35 questions en 1h30 : 29 QCM et 6 exercices pratiques
- Niveau adaptatif : une bonne réponse amène une question plus difficile
- Score estimé sur 1000, correction détaillée à la fin, résumé à copier sur Discord

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La plateforme (affichage, chrono, score, correction) |
| `questions.json` | La banque de questions, chargée par `index.html` |
| `api/resultat.js` | Fonction Vercel : envoie le début et le résultat de chaque examen sur Discord |

## Envoi automatique des résultats (Vercel + Discord)

1. Discord : dans un salon privé, Paramètres du salon → Intégrations → Webhooks → Nouveau webhook → copier l'URL.
2. Vercel : Project → Settings → Environment Variables → `DISCORD_WEBHOOK_URL` = l'URL du webhook, puis redéployer.

La page envoie un message au début de l'examen et un message à la fin (score, détail par domaine, liste des erreurs). Si l'envoi échoue (hors Vercel, pas de réseau), la page propose de réessayer et le résumé reste copiable à la main.

⚠️ La page charge `questions.json` avec `fetch` : elle doit être servie par un serveur (GitHub Pages, Live Server…). Un double-clic sur `index.html` ne fonctionne pas.

## Format de `questions.json`

```json
{
  "qcm": [ ... ],
  "pratiques": [ ... ]
}
```

Les champs de texte long (`code`, `enonce`, `depart`, `solution`) acceptent une chaîne **ou** un tableau de lignes. Dans les textes, `` `code` `` s'affiche en police code et `**gras**` en gras.

### QCM

```json
{
  "categorie": "JavaScript",
  "niveau": 2,
  "question": "Quel est le résultat ?",
  "code": "\"5\" + 1",
  "options": ["`\"51\"`", "`6`", "`\"6\"`", "`NaN`"],
  "reponse": 0,
  "explication": "Avec une chaîne, `+` concatène."
}
```

| Champ | Valeurs |
| --- | --- |
| `categorie` | `HTML`, `CSS`, `JavaScript` ou `Intégration` |
| `niveau` | 1 (facile) à 5 (difficile) |
| `code` | Facultatif : extrait affiché sous la question |
| `options` | Exactement 4 propositions (mélangées à l'affichage) |
| `reponse` | Index de la bonne option : 0 = la première |

### Exercice pratique

```json
{
  "categorie": "JavaScript",
  "niveau": 2,
  "fichier": "js",
  "enonce": ["Écris une fonction `double(n)` qui retourne le double du nombre reçu."],
  "depart": "// Ton code ici\n",
  "verification": "return typeof double === 'function' && double(4) === 8;",
  "solution": ["function double(n) {", "  return n * 2;", "}"]
}
```

| Champ | Valeurs |
| --- | --- |
| `fichier` | `html` : le stagiaire édite un document HTML complet / `js` : il écrit uniquement un script |
| `enonce` | Les lignes qui commencent par `1.`, `2.`… deviennent une liste numérotée |
| `depart` | Le code affiché au départ dans l'éditeur |
| `verification` | Corps d'une fonction JS exécutée dans la page du stagiaire après le chargement : elle doit retourner `true` si l'exercice est réussi |
| `solution` | Affichée dans la correction |

Le code du stagiaire et la vérification s'exécutent dans une iframe isolée (`sandbox="allow-scripts"`), avec 3 secondes maximum.

### Répartition d'un examen

Définie en haut du script de `index.html` : `QUOTA` (questions par catégorie), `PRAT_POS` (positions des exercices pratiques) et `PRAT_CATS` (catégories des exercices pratiques). Prévoir au moins autant de questions par catégorie et par type que le quota.

## Remarques

- Une QCM mal formée (catégorie inconnue, pas 4 options…) est ignorée et signalée dans la console.
- L'examen en cours est enregistré dans le `localStorage` du navigateur du stagiaire, avec les index des questions : éviter de modifier `questions.json` pendant qu'un examen est en cours.
- Les réponses sont lisibles dans le code source : c'est un outil d'entraînement, pas un examen sécurisé.
