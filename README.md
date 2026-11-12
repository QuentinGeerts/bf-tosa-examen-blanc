# Examen blanc - Développement web

Simulation de l'examen de certification (HTML, CSS, JavaScript, Intégration) pour la formation Bruxelles Formation.

- 35 questions en 1h30 : QCM, Vrai/Faux, listes déroulantes, liaisons, glisser-déposer et 6 exercices pratiques (5 min max chacun)
- Niveau adaptatif : une bonne réponse amène une question plus difficile
- Score estimé sur 1000, correction détaillée à la fin, résumé à copier sur Discord

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | La plateforme (affichage, chrono, score, correction) |
| `questions.json` | La banque de questions (QCM, questions interactives, exercices pratiques), chargée par `index.html` |
| `api/resultat.js` | Fonction Vercel : envoie le début et le résultat de chaque examen sur Discord |
| `epreuve.html` | Épreuve blanche commentée : 25 questions adaptées d'une épreuve réelle, solutions en spoiler |

## Envoi automatique des résultats (Vercel + Discord)

1. Discord : dans un salon privé, Paramètres du salon → Intégrations → Webhooks → Nouveau webhook → copier l'URL.
2. Vercel : Project → Settings → Environment Variables → `DISCORD_WEBHOOK_URL` = l'URL du webhook, puis redéployer.

La page envoie un message au début de l'examen, puis à la fin un embed de résumé : score, niveau, détail par domaine, et deux lignes « Réussies » / « Ratées » avec le numéro et l'identifiant de chaque question (ex. `Q4 (C034)`). Si l'envoi échoue (hors Vercel, pas de réseau), la page propose de réessayer et le résumé reste copiable à la main.

⚠️ La page charge `questions.json` avec `fetch` : elle doit être servie par un serveur (GitHub Pages, Live Server…). Un double-clic sur `index.html` ne fonctionne pas.

## Format de `questions.json`

```json
{
  "qcm": [ ... ],
  "interactives": [ ... ],
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

Les QCM acceptent **4 ou 5** options.

### Questions interactives (`interactives`)

Elles occupent les mêmes places que les QCM dans l'examen. Champs communs : `type`, `categorie`, `niveau`, `question`, `code` (facultatif), `explication`. La réponse est juste seulement si tout est juste.

**Vrai / Faux**

```json
{
  "type": "vraifaux", "categorie": "HTML", "niveau": 2,
  "question": "Pour chaque affirmation sur `<title>`, indique si elle est vraie.",
  "affirmations": [
    { "texte": "Son texte s'affiche dans l'onglet", "vrai": true },
    { "texte": "Une page peut contenir plusieurs `<title>`", "vrai": false }
  ],
  "explication": "..."
}
```

**Listes déroulantes** (les options sont mélangées à l'affichage)

```json
{
  "type": "liste", "categorie": "Intégration", "niveau": 3,
  "question": "Manipulation du DOM.",
  "phrases": [
    { "texte": "Pour retirer `li` de `ul` : `ul.___(li)`", "options": ["removeChild", "deleteChild", "pop"], "reponse": "removeChild" }
  ],
  "explication": "..."
}
```

**Relier** (`intrus` = définitions en trop, à ne relier à rien)

```json
{
  "type": "relier", "categorie": "JavaScript", "niveau": 3,
  "question": "Relie chaque méthode de tableau à son effet.",
  "paires": [
    { "gauche": "`push()`", "droite": "Ajoute à la fin" },
    { "gauche": "`pop()`", "droite": "Retire le dernier élément" }
  ],
  "intrus": ["Trie le tableau"],
  "explication": "..."
}
```

**Glisser-déposer**, deux variantes :

- **Bacs** (zones avec un titre, plusieurs étiquettes par zone ; une étiquette absente de toutes les zones doit rester à gauche)

```json
{
  "type": "glisser", "categorie": "HTML", "niveau": 3,
  "question": "Classe chaque élément selon son affichage par défaut.",
  "etiquettes": ["span", "div", "a", "p"],
  "zones": [
    { "titre": "En ligne", "reponses": ["span", "a"] },
    { "titre": "En bloc", "reponses": ["div", "p"] }
  ],
  "explication": "..."
}
```

- **Schéma** (avec `grille` : zones colorées placées en CSS Grid, une étiquette par zone)

```json
{
  "type": "glisser", "categorie": "HTML", "niveau": 2,
  "question": "Glisse chaque élément de structure à sa place.",
  "etiquettes": ["header", "main", "footer", "section"],
  "grille": { "colonnes": "1fr", "lignes": "60px 150px 54px" },
  "zones": [
    { "reponses": ["header"], "aire": "1 / 1 / 2 / 2", "couleur": "#2e7d32", "decor": "LOGO" },
    { "reponses": ["main"], "aire": "2 / 1 / 3 / 2", "couleur": "#9e9e9e" },
    { "reponses": ["footer"], "aire": "3 / 1 / 4 / 2", "couleur": "#ef6c00", "decor": "© 2026" }
  ],
  "explication": "..."
}
```

`aire` suit la syntaxe de `grid-area` : `ligne-début / colonne-début / ligne-fin / colonne-fin`. `decor` est un petit texte indicatif affiché dans la zone.

**Texte à compléter** (`___` dans le code = une case ; plusieurs réponses acceptées par case)

```json
{ "type": "trou", "categorie": "JavaScript", "niveau": 4, "question": "Complète…",
  "code": "const objet = JSON.___(texte);", "reponses": [["parse"]], "explication": "..." }
```

**Lignes à cliquer** (`erreurs` = numéros des lignes fautives, `[]` = « Il n'y a pas d'erreur »)

```json
{ "type": "lignes", "categorie": "HTML", "niveau": 3, "question": "Clique sur les lignes invalides…",
  "lignes": ["<ul>", "  <li>Accueil", "</ul>"], "erreurs": [2], "explication": "..." }
```

**Question de documentation** : n'importe quelle question interactive peut recevoir un lien autorisé et un chrono (la sortie d'onglet n'est alors pas comptée).

```json
"documentation": { "lien": "https://developer.mozilla.org/fr/docs/Web/CSS/object-fit", "titre": "MDN – object-fit" },
"chrono_secondes": 300
```

### Exercice pratique (3 éditeurs : HTML / CSS / JS)

Comme à l'examen, le stagiaire voit 3 onglets `index.html`, `style.css`, `script.js`. Les fichiers `verrouille: true` sont en lecture seule (ils donnent des informations, ex. les classes disponibles dans le CSS). 5 minutes maximum par exercice.

```json
{
  "id": "C049",
  "categorie": "CSS",
  "niveau": 4,
  "enonce": ["Ajoute les bonnes classes aux tâches pour obtenir le **rendu attendu**."],
  "fichiers": {
    "html": { "code": ["<!DOCTYPE html>", "..."], "verrouille": false },
    "css":  { "code": ["/* Dans cette question, tu n'as pas besoin de modifier le CSS */", "..."], "verrouille": true },
    "js":   { "code": "// Dans cette question, tu n'as pas besoin de modifier le JavaScript\n", "verrouille": true }
  },
  "rendu_attendu": true,
  "verification": "return document.getElementById('t1').classList.contains('urgente');",
  "solution": { "html": ["<!DOCTYPE html>", "..."] }
}
```

| Champ | Valeurs |
| --- | --- |
| `fichiers` | Les 3 fichiers de départ. La page est assemblée ainsi : le CSS dans le `<head>`, le JS en bas du `<body>` |
| `enonce` | Les lignes qui commencent par `1.`, `2.`… deviennent une liste numérotée |
| `apres` | Facultatif : script caché exécuté après le JS du stagiaire (ex. un tableau « Appel / Résultat » des tests, comme à l'examen) |
| `rendu_attendu` | Facultatif : affiche le rendu de la solution à côté du rendu du stagiaire |
| `verification` | Corps d'une fonction JS exécutée dans la page du stagiaire après le chargement : elle doit retourner `true` si l'exercice est réussi. Les variables `code`, `css` et `js` contiennent le code source des 3 fichiers tel qu'écrit par le stagiaire (utile quand le navigateur corrige le HTML tout seul, ex. un `<tbody>` absent) |
| `solution` | Uniquement les fichiers à modifier ; affichée dans la correction |
| `criteres` | Facultatif : liste `{ "nom", "test" }` (même principe que `verification`, un test par critère, exécutés dans l'ordre). Score partiel = % de critères réussis ; l'exercice est réussi si tous le sont |

La console affiche les `console.log`, les erreurs et la **pile d'appels** avec les numéros de ligne de `script.js`.

Le code du stagiaire et la vérification s'exécutent dans une iframe isolée (`sandbox="allow-scripts"`), avec 3 secondes maximum.

### Répartition d'un examen

Définie en haut du script de `index.html` : `QUOTA` (questions par catégorie), `PRAT_POS` (positions des exercices pratiques) et `PRAT_CATS` (catégories des exercices pratiques). Prévoir au moins autant de questions par catégorie et par type que le quota.

## Remarques

- Une QCM mal formée (catégorie inconnue, pas 4 options…) est ignorée et signalée dans la console.
- L'examen en cours est enregistré dans le `localStorage` du navigateur du stagiaire, avec les index des questions : éviter de modifier `questions.json` pendant qu'un examen est en cours.
- Les réponses sont lisibles dans le code source : c'est un outil d'entraînement, pas un examen sécurisé.

## Contrôler la banque après une modification

```bash
node verifier.js             # structure de toutes les questions (identifiants, réponses, zones, lignes…)
node verifier.js --extraits  # + résultat réel des extraits JavaScript des QCM, à comparer avec la réponse indiquée
```

Puis, dans le navigateur, ouvrir la page de l'examen avec `#verifier` à la fin de l'adresse : chaque exercice est corrigé avec sa solution (100/100 attendu) et son code de départ, et chaque question interactive avec sa bonne réponse. Les lignes en rouge signalent un problème.
