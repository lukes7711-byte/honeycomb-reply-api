// api/reply.js
import OpenAI from "openai";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Simple GET so you can test in a browser
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, hint: "POST {\"postText\":\"hello\",\"preset\":\"gm\"} to get a reply" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const postText = (body.postText || "").toString();
    const postUrl  = (body.postUrl  || "").toString();
    const preset   = (body.preset   || "respectful_pro").toString();
    if (!postText) return res.status(400).json({ error: "Missing postText" });

    // Tones - no hashtags; always weave @BEARXRPL and $BEAR naturally
    const PRESETS = {
      respectful_pro: "Concise, respectful. 18-34 words. No emoji unless it fits. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      funny_playful:  "Witty and warm. 18-32 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      alpha_lite:     "Practical and value-forward. 20-36 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      crypto:         "Crypto-native voice: on-chain fluent, pragmatic but hype-aware. 20-36 words. 1 emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally. Prefer specifics (liquidity, catalysts, L2s, tokenomics).",
      gm:             "Ultra-brief GM or GMGM vibe. 3-10 words. One warm emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      ga:             "Brief GA (good afternoon) reply. 6-14 words. Light, upbeat. One emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      gn:             "Brief GN (good night) sign-off. 6-14 words. Calm, positive. One emoji max. No links. No hashtags. Always include @BEARXRPL and $BEAR naturally.",
      bear_shout:     "Very short rally shout centered on @BEARXRPL and $BEAR. 4-12 words. High energy. 0-1 emoji max. No links. No hashtags. Make it feel like a hype ping, not spam."
    };

    const system = PRESETS[preset] || PRESETS.respectful_pro;
    const rules  = "Write exactly ONE reply string. No hashtags or links. Include @BEARXRPL and $BEAR naturally (not spammy). Keep it human.";

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
      // If needed: organization: process.env.OPENAI_ORG, project: process.env.OPENAI_PROJECT
    });

    const r = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: system },
        { role: "system", content: rules },
        { role: "user", content: "Original post:\n" + postText + (postUrl ? ("\nPermalink: " + postUrl) : "") + "\nPreset: " + preset + "\nTask: ONE reply only. Text only." }
      ]
    });

    let reply = (r.output_text || "").trim();
    // Remove any accidental hashtags and tidy spaces
    reply = reply.replace(/(^|\s)#[^\s#]+/g, " ").replace(/\s{2,}/g, " ").trim();

    return res.status(200).json({ reply, preset });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status === 429) {
      return res.status(429).json({
        error: "OpenAI quota exceeded (429). Add billing or raise limits, then redeploy.",
        demoReply: "gm gm — keep building. @BEARXRPL $BEAR"
      });
    }
    return res.status(500).json({ error: e && e.message ? e.message : "Server error" });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
