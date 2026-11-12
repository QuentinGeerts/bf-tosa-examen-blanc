// Contrôle de questions.json — à lancer après chaque modification :
//   node verifier.js            → vérifie la structure de toutes les questions
//   node verifier.js --extraits → affiche aussi le résultat réel des extraits JavaScript des QCM
// Les exercices pratiques se vérifient dans le navigateur : ouvrir la page de l'examen avec #verifier à la fin de l'adresse.

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const fichier = path.join(__dirname, "questions.json");
let data;
try {
  data = JSON.parse(fs.readFileSync(fichier, "utf8"));
} catch (e) {
  console.error("✗ questions.json n'est pas un JSON valide : " + e.message);
  process.exit(1);
}

const CATEGORIES = { H: "HTML", C: "CSS", J: "JavaScript", I: "Intégration" };
const TYPES = ["vraifaux", "liste", "relier", "glisser", "trou", "lignes", "images", "multiple"];
const txt = (v) => (Array.isArray(v) ? v.join("\n") : v || "");
const problemes = [];
const pb = (q, msg) => problemes.push(`${q.id || "(sans id)"} : ${msg}`);
const ids = new Set();
let total = 0;

for (const [liste, questions] of Object.entries(data)) {
  if (!["qcm", "interactives", "pratiques"].includes(liste)) { problemes.push(`liste inconnue « ${liste} »`); continue; }
  for (const q of questions) {
    total++;
    // champs communs
    if (!/^[HCJI]\d{3}$/.test(q.id || "")) pb(q, "identifiant manquant ou mal formé (ex. H061)");
    else if (CATEGORIES[q.id[0]] !== q.categorie) pb(q, `la lettre de l'identifiant ne correspond pas à la catégorie « ${q.categorie} »`);
    if (ids.has(q.id)) pb(q, "identifiant en double");
    ids.add(q.id);
    if (!Object.values(CATEGORIES).includes(q.categorie)) pb(q, `catégorie inconnue « ${q.categorie} »`);
    if (!(Number.isInteger(q.niveau) && q.niveau >= 1 && q.niveau <= 5)) pb(q, "niveau entre 1 et 5 attendu");
    if ((JSON.stringify(q).match(/`/g) || []).length % 2) pb(q, "nombre impair de ` (un code en ligne n'est pas fermé)");

    if (liste === "qcm") {
      if (!q.question) pb(q, "question manquante");
      if (!Array.isArray(q.options) || ![4, 5].includes(q.options.length)) pb(q, "4 ou 5 options attendues");
      else {
        if (new Set(q.options).size !== q.options.length) pb(q, "deux options identiques");
        if (!(Number.isInteger(q.reponse) && q.reponse >= 0 && q.reponse < q.options.length)) pb(q, "reponse = index de la bonne option (0 = la première)");
      }
      if (!q.explication) pb(q, "explication manquante");
    }

    if (liste === "interactives") {
      if (!TYPES.includes(q.type)) { pb(q, `type inconnu « ${q.type} »`); continue; }
      if (!q.question) pb(q, "question manquante");
      if (!q.explication) pb(q, "explication manquante");
      if (q.type === "vraifaux") {
        if (!Array.isArray(q.affirmations) || q.affirmations.length < 2) pb(q, "au moins 2 affirmations");
        else if (q.affirmations.some((a) => typeof a.vrai !== "boolean")) pb(q, "chaque affirmation doit avoir vrai: true ou false");
      }
      if (q.type === "liste") for (const p of q.phrases || []) if (!p.options.includes(p.reponse)) pb(q, `la réponse « ${p.reponse} » n'est pas dans les options`);
      if (q.type === "relier") {
        const droites = (q.paires || []).map((p) => p.droite).concat(q.intrus || []);
        if (new Set(droites).size !== droites.length) pb(q, "deux définitions identiques");
      }
      if (q.type === "glisser") {
        const etiquettes = new Set(q.etiquettes);
        if (etiquettes.size !== q.etiquettes.length) pb(q, "deux étiquettes identiques");
        for (const z of q.zones || []) for (const r of z.reponses) if (!etiquettes.has(r)) pb(q, `l'étiquette « ${r} » n'existe pas`);
        if (q.grille) for (const z of q.zones) if (!z.aire) pb(q, "chaque zone d'un schéma doit avoir une « aire »");
      }
      if (q.type === "trou" && txt(q.code).split("___").length - 1 !== (q.reponses || []).length) pb(q, "autant de ___ dans le code que de réponses");
      if (q.type === "lignes") for (const n of q.erreurs || []) if (!(n >= 1 && n <= q.lignes.length)) pb(q, `ligne ${n} hors du code`);
      if (q.type === "images") {
        if (!Array.isArray(q.images) || ![4, 5].includes(q.images.length)) pb(q, "4 ou 5 images attendues");
        else if (!(q.reponse >= 0 && q.reponse < q.images.length)) pb(q, "reponse = index de la bonne image");
        for (const im of q.images || []) if (!/^<svg[\s>]/.test(txt(im).trim())) pb(q, "chaque image doit être un code <svg>");
      }
      if (q.type === "multiple") {
        if (!Array.isArray(q.options) || q.options.length < 3) pb(q, "au moins 3 options");
        if (!Array.isArray(q.reponses) || !q.reponses.length) pb(q, "au moins une bonne réponse (reponses: [index…])");
        else for (const r of q.reponses) if (!(r >= 0 && r < q.options.length)) pb(q, `réponse ${r} hors des options`);
      }
      if (q.documentation && !/^https:\/\//.test(q.documentation.lien || "")) pb(q, "lien de documentation en https:// attendu");
    }

    if (liste === "pratiques") {
      if (!q.enonce) pb(q, "énoncé manquant");
      for (const k of ["html", "css", "js"]) if (!q.fichiers || !q.fichiers[k]) pb(q, `fichier ${k} manquant`);
      if (q.fichiers && !Object.values(q.fichiers).some((f) => !f.verrouille)) pb(q, "aucun fichier modifiable");
      for (const k of Object.keys(q.solution || {})) if (q.fichiers && q.fichiers[k] && q.fichiers[k].verrouille) pb(q, `solution donnée pour un fichier verrouillé (${k})`);
      if (!q.verification && !(q.criteres && q.criteres.length)) pb(q, "verification ou criteres attendus");
      for (const c of q.criteres || []) {
        try { new Function("code", "css", "js", c.test); } catch (e) { pb(q, `critère « ${c.nom} » : JavaScript invalide (${e.message})`); }
      }
    }
  }
}

// Extraits JavaScript des QCM : exécutés pour comparer avec la réponse attendue (contrôle visuel)
if (process.argv.includes("--extraits")) {
  console.log("\nExtraits JavaScript (résultat réel → réponse indiquée) :");
  for (const q of data.qcm) {
    if (q.categorie !== "JavaScript" || !q.code) continue;
    const logs = [];
    let valeur;
    try {
      valeur = vm.runInNewContext(txt(q.code), { console: { log: (...a) => logs.push(a.map((x) => JSON.stringify(x)).join(" ")) }, Promise, fetch: () => Promise.resolve() }, { timeout: 500 });
    } catch (e) {
      valeur = e.name;
    }
    const res = logs.length ? "affiche " + logs.join(" / ") : JSON.stringify(valeur);
    console.log(`  ${q.id}  ${String(res).slice(0, 40).padEnd(40)} → ${q.options[q.reponse]}`);
  }
}

const compte = (l) => (data[l] || []).length;
console.log(`\n${total} questions : ${compte("qcm")} QCM, ${compte("interactives")} interactives, ${compte("pratiques")} exercices`);
if (problemes.length) {
  console.log(`\n✗ ${problemes.length} problème(s) :`);
  problemes.forEach((p) => console.log("  - " + p));
  process.exit(1);
}
console.log("✓ Aucun problème détecté.");
