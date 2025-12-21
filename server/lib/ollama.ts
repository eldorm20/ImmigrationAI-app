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

export async function probeOllamaEndpoint(url: string, model?: string, timeoutMs = 2500) {
  if (typeof (globalThis as any).fetch !== "function") {
    return { reachable: false, reason: "fetch not available" };
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Try an OPTIONS first
      const opts = { method: "OPTIONS", signal: controller.signal } as any;
      const r = await (globalThis as any).fetch(url, opts).catch(() => null);
      if (r && r.status < 500) return { reachable: true, status: r.status };

      // Try GET
      const r2 = await (globalThis as any).fetch(url, { method: "GET", signal: controller.signal }).catch(() => null);
      if (r2 && r2.status < 500) return { reachable: true, status: r2.status };

      // Try a small POST probe
      let probeUrl = url;
      if (!probeUrl.includes("/api/") && !probeUrl.includes("/v1/")) {
        probeUrl = probeUrl.replace(/\/+$/, "") + "/api/generate";
      }

      const body = JSON.stringify(buildOllamaPayload("health-check", undefined, model));
      const r3 = await (globalThis as any).fetch(probeUrl, { method: "POST", body, headers: { "Content-Type": "application/json" }, signal: controller.signal }).catch(() => null);
      if (r3) return { reachable: r3.status < 500, status: r3.status };
      return { reachable: false, reason: "no response" };
    } finally {
      clearTimeout(id);
    }
  } catch (err: any) {
    return { reachable: false, reason: err?.message || String(err) };
  }
}
