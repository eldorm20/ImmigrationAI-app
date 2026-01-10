import { logger } from "./logger";

export function buildOllamaPayload(prompt: string, systemPrompt?: string, model?: string, messages?: Array<{ role: string, content: string }>) {
  // Ollama supports both /api/generate (prompt-based) and /api/chat (messages-based)
  // Use messages format if conversation history is provided for better context
  if (messages && messages.length > 0) {
    const body: any = {
      model: model || "mistral",
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }))
      ],
      stream: false,
      options: {
        temperature: 0.5,
        repeat_penalty: 1.1,
        num_predict: 512
      }
    };
    return body;
  }

  // Fallback to prompt-based format
  const body: any = {
    prompt: `${systemPrompt || ""}\n\n${prompt}`.trim(),
    stream: false,
    options: {
      temperature: 0.5,
      repeat_penalty: 1.1,
      num_predict: 512
    }
  };
  if (model) body.model = model;
  return body;
}

export function parseOllamaResponse(json: any): string | null {
  try {
    if (!json) return null;

    // Official Ollama /api/generate format
    if (typeof json.response === "string") return json.response;

    // Official Ollama /api/chat format
    if (json.message && typeof json.message.content === "string") return json.message.content;

    // Ollama often returns { output: [{ type: 'message', content: '...' }], metadata: {...} }
    if (json.output && Array.isArray(json.output)) {
      // Find first content string
      for (const o of json.output) {
        if (typeof o === "string") return o;
        if (o && typeof o.content === "string") return o.content;
        // Sometimes content is an array of segments
        if (o && Array.isArray(o.content) && typeof o.content[0] === "string") return o.content.join("");
      }
    }

    // Some local servers return { generations: [{ text }] }
    if (json.generations && Array.isArray(json.generations) && json.generations[0]?.text) return json.generations[0].text;

    // TGI/Others: [{ generated_text }]
    if (Array.isArray(json) && json[0]?.generated_text) return json[0].generated_text;

    if (json.generated_text) return json.generated_text;

    if (json.text) return json.text;

    // choices shape
    if (json.choices && Array.isArray(json.choices) && json.choices[0]?.text) return json.choices[0].text;

    // If nothing matched, return null to let caller fallback
    return null;
  } catch (err: any) {
    logger.warn({ err }, "Failed to parse Ollama response");
    return null;
  }
}

export async function probeOllamaEndpoint(url: string, model: string = "mistral", timeoutMs = 5000) {
  if (typeof (globalThis as any).fetch !== "function") {
    return { reachable: false, reason: "fetch not available" };
  }

  const baseUrl = url.replace(/\/+$/, "");

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // 1. First, check /api/tags to see if the model is already pulled
      const tagsUrl = `${baseUrl}/api/tags`;
      const tagsRes = await (globalThis as any).fetch(tagsUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: controller.signal
      }).catch(() => null);

      if (tagsRes && tagsRes.ok) {
        const data = await tagsRes.json();
        const models = data.models || [];
        const hasModel = models.some((m: any) => m.name === model || m.name.startsWith(`${model}:`));

        if (hasModel) {
          return { reachable: true, status: 200, hasModel: true };
        } else {
          // Model not found in tags
          return { reachable: true, status: 404, hasModel: false, reason: "model_not_pulled" };
        }
      }

      // 2. If /api/tags fails, try the root with OPTIONS to check if server is alive
      const opts = { method: "OPTIONS", signal: controller.signal } as any;
      const r = await (globalThis as any).fetch(baseUrl, opts).catch(() => null);
      if (r && r.status < 500) {
        // Server exists but /api/tags failed. Could be a non-Ollama server or proxy.
        return { reachable: true, status: r.status, reason: "server_responded_but_no_tags" };
      }

      // 3. Fallback to /api/generate probe
      let generateUrl = baseUrl;
      if (!generateUrl.includes("/api/") && !generateUrl.includes("/v1/")) {
        generateUrl += "/api/generate";
      }

      const body = JSON.stringify({ model, prompt: "health-check", stream: false });
      const r3 = await (globalThis as any).fetch(generateUrl, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        signal: controller.signal
      }).catch(() => null);

      if (r3) {
        return { reachable: r3.status < 500, status: r3.status };
      }

      return { reachable: false, reason: "no response from any endpoint" };
    } finally {
      clearTimeout(id);
    }
  } catch (err: any) {
    return { reachable: false, reason: err?.message || String(err) };
  }
}

export async function generateOllamaEmbedding(text: string, url: string, model?: string): Promise<number[] | null> {
  try {
    let embedUrl = url.replace(/\/+$/, "");
    if (embedUrl.endsWith("/api/embeddings") || embedUrl.endsWith("/v1/embeddings")) {
      // already correct
    } else if (embedUrl.endsWith("/api")) {
      embedUrl = `${embedUrl}/embeddings`;
    } else if (embedUrl.endsWith("/v1")) {
      embedUrl = `${embedUrl}/embeddings`;
    } else if (!embedUrl.includes("/api") && !embedUrl.includes("/v1")) {
      embedUrl = `${embedUrl}/api/embeddings`;
    }

    const res = await fetch(embedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || process.env.OLLAMA_MODEL || "mistral",
        prompt: text
      })
    });

    if (res.ok) {
      const json = await res.json();
      return json.embedding;
    }
    const errText = await res.text().catch(() => "Unknown error");
    logger.error({ status: res.status, error: errText }, "Ollama embedding request failed");
    return null;
  } catch (err) {
    logger.error({ err }, "Failed to generate Ollama embedding");
    return null;
  }
}
