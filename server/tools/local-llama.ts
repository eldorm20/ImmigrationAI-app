import { agentsManager } from "../lib/ai";

/**
 * Quick smoke test for running all AI features against a free local provider.
 *
 * Configure one of:
 * - OLLAMA_URL (defaults to http://127.0.0.1:11434/api/generate) and OLLAMA_MODEL=llama3
 * - HF_INFERENCE_URL (e.g. http://127.0.0.1:8080/generate) and HF_MODEL
 *
 * Then run:
 *   npm run ai:test:local
 */
async function main() {
  const provider =
    process.env.OLLAMA_URL || process.env.OLLAMA_MODEL
      ? "ollama"
      : process.env.HF_INFERENCE_URL || process.env.HF_MODEL
        ? "huggingface"
        : "unknown";

  if (provider === "unknown") {
    console.warn(
      "No local LLM configured. Set OLLAMA_URL/OLLAMA_MODEL or HF_INFERENCE_URL/HF_MODEL to use a free local model."
    );
  } else {
    console.log(`Using provider: ${provider}`);
  }

  const scenarios = [
    agentsManager.processRequest("immigration-law", "analyzeVisaOptions", [
      { nationality: "UZ", qualifications: ["BSc Computer Science"], income: 45000, familyStatus: "single" },
    ]),
    agentsManager.processRequest("document-analysis", "analyzeDocument", [
      "Passport",
      { name: "John Doe", issued: "2022" },
    ]),
    agentsManager.processRequest("customer-service", "handleUserQuery", [
      "How do I book a consultation with a lawyer?",
      { channel: "cli-smoke-test" },
    ]),
  ];

  const results = await Promise.allSettled(scenarios);
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      console.log(`Scenario ${idx + 1} ✅`, result.value);
    } else {
      console.error(`Scenario ${idx + 1} ❌`, result.reason);
    }
  });
}

main().catch((err) => {
  console.error("Local LLaMA smoke test failed:", err);
  process.exit(1);
});

