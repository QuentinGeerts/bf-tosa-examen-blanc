// Fonction Vercel : reçoit le début / la fin d'un examen et le poste sur Discord (embeds).
// L'URL du webhook est dans la variable d'environnement DISCORD_WEBHOOK_URL (jamais dans le code).

const CATS = { H: "HTML", C: "CSS", J: "JavaScript", I: "Intégration" };
const COULEURS = { Initial: 0xb03434, Basique: 0xe07b24, "Opérationnel": 0xd4b106, "Avancé": 0x2c7a4b, Expert: 0x1e3a5f };

const texte = (v, max) => String(v ?? "").replace(/@/g, "@​").slice(0, max).trim();
const coupe = (v, max) => { const s = String(v ?? ""); return s.length > max ? s.slice(0, max - 1) + "…" : s; };
const nombre = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

async function poster(webhook, corps) {
  const rep = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...corps, allowed_mentions: { parse: [] } }),
  });
  return rep.ok;
}

function resume(d) {
  const nom = texte(d.nom, 60) || "Inconnu";
  const total = nombre(d.total, 1, 100);
  const ok = nombre(d.ok, 0, total);
  const score = nombre(d.score, 1, 1000);
  const niveau = texte(d.niveau, 20);
  return {
    title: coupe(`Examen blanc - ${nom}`, 256),
    color: COULEURS[niveau] ?? 0x5d6574,
    description: [
      `Score estimé : **${score} / 1000** (${niveau})`,
      `Bonnes réponses : **${ok} / ${total}** (${Math.round((ok / total) * 100)} %)`,
      `Exercices pratiques : ${nombre(d.pOk, 0, 10)}/${nombre(d.pN, 0, 10)} réussis · score moyen ${nombre(d.pScore, 0, 100)}/100`,
      `Durée : ${nombre(d.duree, 0, 600)} min${d.timeout ? " (temps écoulé)" : ""}`,
      d.tentative && nombre(d.tentative.n, 1, 999) > 1
        ? `📈 Tentative n°${nombre(d.tentative.n, 1, 999)}${d.tentative.precedent != null ? ` · précédente : ${nombre(d.tentative.precedent, 1, 1000)} (${score - nombre(d.tentative.precedent, 1, 1000) >= 0 ? "+" : ""}${score - nombre(d.tentative.precedent, 1, 1000)})` : ""}`
        : "📈 Première tentative",
      nombre(d.sorties, 0, 999)
        ? `⚠️ A quitté l'onglet de l'examen **${nombre(d.sorties, 0, 999)} fois** (${Math.round(nombre(d.sortiesMs, 0, 1e8) / 1000)} s au total)`
        : "Onglet de l'examen : jamais quitté",
    ].join("\n"),
    fields: [
      ...Object.keys(CATS).map((c) => ({
        name: CATS[c],
        value: `${nombre(d.cats?.[c]?.[0], 0, 100)} / ${nombre(d.cats?.[c]?.[1], 0, 100)}${d.niveaux?.[c] ? `\n${texte(d.niveaux[c], 20)}` : ""}`,
        inline: true,
      })),
      { name: "✅ Réussies", value: listeQuestions(d.reussies) },
      { name: "❌ Ratées", value: listeQuestions(d.erreurs) },
    ],
    footer: { text: `Examen ${texte(d.id, 12)}` },
  };
}

// « Q1 (H017), Q4 (C034), … »
function listeQuestions(liste) {
  const items = (Array.isArray(liste) ? liste : []).slice(0, 100).map((e) => {
    const id = /^[A-Za-z0-9-]{1,12}$/.test(e.id || "") ? e.id : "";
    const t = nombre(e.t, 0, 6000);
    const temps = t ? (t < 60 ? `${t} s` : `${Math.floor(t / 60)} min ${String(t % 60).padStart(2, "0")}`) : "";
    const score = e.s != null && e.s !== "" ? `${nombre(e.s, 0, 100)}/100` : "";
    const details = [id, temps, score].filter(Boolean).join(" · ");
    return `Q${nombre(e.i, 1, 100)}${details ? ` (${details})` : ""}`;
  });
  return coupe(items.join(", "), 1024) || "—";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return res.status(500).json({ ok: false, erreur: "DISCORD_WEBHOOK_URL manquant" });

  let d;
  try {
    d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch (e) {
    return res.status(400).json({ ok: false });
  }

  try {
    if (d.type === "debut") {
      const ok = await poster(webhook, { content: `▶️ **${texte(d.nom, 60) || "Inconnu"}** a commencé l'examen blanc (examen ${texte(d.id, 12)})` });
      return res.status(ok ? 200 : 502).json({ ok });
    }
    if (d.type === "commentaire") {
      const id = /^[A-Za-z0-9-]{1,12}$/.test(d.qid || "") ? ` (${d.qid})` : "";
      const ok = await poster(webhook, { content: `💬 **${texte(d.nom, 60) || "Inconnu"}** — Q${nombre(d.i, 1, 100)}${id} : « ${texte(d.texte, 500)} »` });
      return res.status(ok ? 200 : 502).json({ ok });
    }
    if (d.type !== "fin") return res.status(400).json({ ok: false });

    const ok = await poster(webhook, { embeds: [resume(d)] });
    return res.status(ok ? 200 : 502).json({ ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
