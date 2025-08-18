// api/reply.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // CORS (lets the extension call this endpoint)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Simple GET so you can test in a browser
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, hint: 'POST {"postText":"hello"} to get a reply' });
  }

  try {
    // Safe JSON parse
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { postText = "", postUrl = "", preset = "bear_hype", seed } = body;
    if (!postText) return res.status(400).json({ error: "Missing postText" });

    // Impressions-first brand voice (no hashtags; include @BEARXRPL + $BEAR)
    const PRESETS = {
      bear_hype: "Voice: clever, confident, welcoming. 18–36 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally. Add a tiny twist and a micro-question.",
      funny_playful: "Witty and warm. 18–32 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      alpha_lite: "Practical and value-forward. 20–36 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      respectful_pro: "Concise, respectful. 18–34 words. No emoji unless it fits. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      question_hook: "Question-forward hook. 16–28 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally."
    };
    const ORDER = ["bear_hype", "funny_playful", "alpha_lite", "question_hook"];
    const pick = (p, s) => (p !== "rotate" ? (PRESETS[p] ? p : "bear_hype")
      : ORDER[(typeof s === "number" ? Math.abs(s) : Math.floor(Math.random()*ORDER.length)) % ORDER.length]);

    const chosen = pick(preset, seed);
    const system = PRESETS[chosen];
    const rules = "Write ONE reply only. No hashtags or links. Include @BEARXRPL and $BEAR naturally (not spammy). If the post is serious, switch to respectful tone.";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "system", content: rules },
        { role: "user", content: `Original post:\n${postText}\n${postUrl ? `Permalink: ${postUrl}` : ""}\nPreset: ${chosen}\nTask: Write exactly ONE reply text only.` }
      ]
    });

    let reply = (r.output_text || "").trim();
    reply = reply.replace(/(^|\s)#[^\s#]+/g, "").replace(/\s{2,}/g, " ").trim();

    return res.status(200).json({ reply, preset: chosen });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
