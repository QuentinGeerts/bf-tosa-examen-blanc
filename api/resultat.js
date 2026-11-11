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
      `Exercices pratiques : ${nombre(d.pOk, 0, 10)}/${nombre(d.pN, 0, 10)}`,
      `Durée : ${nombre(d.duree, 0, 600)} min${d.timeout ? " (temps écoulé)" : ""}`,
    ].join("\n"),
    fields: Object.keys(CATS).map((c) => ({
      name: CATS[c],
      value: `${nombre(d.cats?.[c]?.[0], 0, 100)} / ${nombre(d.cats?.[c]?.[1], 0, 100)}`,
      inline: true,
    })),
    footer: { text: `Examen ${texte(d.id, 12)} · ${(Array.isArray(d.erreurs) ? d.erreurs.length : 0)} question(s) ratée(s)` },
  };
}

function champErreur(e) {
  const id = /^[A-Za-z0-9-]{1,12}$/.test(e.id || "") ? ` · ${e.id}` : "";
  const lignes = [texte(e.q, 300)];
  if (e.code) lignes.push("```\n" + coupe(String(e.code).replace(/```/g, "'''"), 250) + "\n```");
  if (e.rep) lignes.push(`**Réponse :** ${texte(e.rep, 450)}`);
  if (e.attendu) lignes.push(`**Attendu :** ${texte(e.attendu, 250)}`);
  return {
    name: coupe(`❌ Q${nombre(e.i, 1, 100)}${id} · ${CATS[e.c] || "?"} · niv. ${nombre(e.n, 1, 5)}`, 256),
    value: coupe(lignes.join("\n"), 1024) || "—",
  };
}

// Discord : 25 champs par embed, 10 embeds et 6000 caractères par message
function messagesErreurs(erreurs) {
  const champs = erreurs.slice(0, 40).map(champErreur);
  const messages = [];
  let embeds = [], embed = null, taille = 0;
  for (const ch of champs) {
    const t = ch.name.length + ch.value.length;
    if (taille + t > 5500 || embeds.length === 10 && embed.fields.length === 25) {
      messages.push({ embeds }); embeds = []; embed = null; taille = 0;
    }
    if (!embed || embed.fields.length === 25) {
      embed = { title: embeds.length || messages.length ? "Questions ratées (suite)" : "Questions ratées", color: 0xb03434, fields: [] };
      embeds.push(embed);
      taille += embed.title.length;
    }
    embed.fields.push(ch);
    taille += t;
  }
  if (embeds.length) messages.push({ embeds });
  return messages;
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
    if (d.type !== "fin") return res.status(400).json({ ok: false });

    let ok = await poster(webhook, { embeds: [resume(d)] });
    for (const m of messagesErreurs(Array.isArray(d.erreurs) ? d.erreurs : [])) {
      ok = (await poster(webhook, m)) && ok;
    }
    return res.status(ok ? 200 : 502).json({ ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
