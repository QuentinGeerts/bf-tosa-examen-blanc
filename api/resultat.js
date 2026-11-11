// Fonction Vercel : reçoit le début / la fin d'un examen et le poste sur Discord.
// L'URL du webhook est dans la variable d'environnement DISCORD_WEBHOOK_URL (jamais dans le code).

const CATS = { H: "HTML", C: "CSS", J: "JavaScript", I: "Intégration" };

const texte = (v, max) => String(v ?? "").replace(/[`*_~|<>@#]/g, "").slice(0, max).trim();
const nombre = (v, min, max) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));

function message(d) {
  const nom = texte(d.nom, 60) || "Inconnu";
  const id = texte(d.id, 12);

  if (d.type === "debut") {
    return `▶️ **${nom}** a commencé l'examen blanc (examen ${id})`;
  }

  const total = nombre(d.total, 1, 100);
  const ok = nombre(d.ok, 0, total);
  const score = nombre(d.score, 1, 1000);
  const cats = Object.keys(CATS)
    .map((c) => `${CATS[c]} ${nombre(d.cats?.[c]?.[0], 0, 100)}/${nombre(d.cats?.[c]?.[1], 0, 100)}`)
    .join(" · ");
  const erreurs = (Array.isArray(d.erreurs) ? d.erreurs : [])
    .slice(0, 40)
    .map((e) => `Q${nombre(e.i, 1, 100)} ${CATS[e.c] || "?"} (niv. ${nombre(e.n, 1, 5)})`)
    .join(", ");

  return [
    `✅ **Examen blanc - ${nom}** (examen ${id})`,
    `Score estimé : **${score} / 1000** (${texte(d.niveau, 20)})`,
    `Bonnes réponses : ${ok} / ${total} (${Math.round((ok / total) * 100)} %)`,
    cats,
    `Exercices pratiques : ${nombre(d.pOk, 0, 10)}/${nombre(d.pN, 0, 10)} · Durée : ${nombre(d.duree, 0, 600)} min${d.timeout ? " (temps écoulé)" : ""}`,
    erreurs ? `Erreurs : ${erreurs}` : "Aucune erreur",
  ].join("\n");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return res.status(500).json({ ok: false, erreur: "DISCORD_WEBHOOK_URL manquant" });

  const d = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  if (!["debut", "fin"].includes(d.type)) return res.status(400).json({ ok: false });

  const rep = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message(d), allowed_mentions: { parse: [] } }),
  });

  return res.status(rep.ok ? 200 : 502).json({ ok: rep.ok });
};
