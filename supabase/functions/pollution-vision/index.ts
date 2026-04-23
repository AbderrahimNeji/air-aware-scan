import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 requis");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Tu es un expert en analyse visuelle de la pollution atmosphérique. Analyse l'image fournie et identifie:
1. Le type de lieu (urbain, industriel, rural, côtier, désertique)
2. Les sources visibles de pollution (trafic, industrie, fumée, smog, déchets, etc.)
3. Une estimation visuelle de la qualité de l'air (Bonne/Modérée/Mauvaise/Très mauvaise)
4. Une localisation probable en Tunisie si reconnaissable (sinon "Lieu non identifié")
5. Recommandations brèves

Réponds STRICTEMENT en JSON valide avec cette structure:
{"lieu":"...","type":"...","sources":["...","..."],"qualite":"Bonne|Modérée|Mauvaise|Très mauvaise","aqi_estime":number,"localisation_tunisie":"...","analyse":"texte d'analyse en 2-3 phrases","recommandations":["..."]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse cette image pour la pollution atmosphérique." },
              { type: "image_url", image_url: { url: imageBase64 } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("vision error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur analyse" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try { parsed = JSON.parse(content); } catch { parsed = { analyse: content }; }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
