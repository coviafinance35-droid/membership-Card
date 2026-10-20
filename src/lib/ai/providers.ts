import { z } from "zod";

const providerSchema = z.enum(["groq", "ollama"]);
const outputSchema = z.object({
  organization_name: z.string().min(1).max(100),
  member_name: z.string().min(1).max(100),
  membership_type: z.string().min(1).max(50),
  expiration_date: z.string().max(30).nullable(),
  template: z.enum(["premium", "modern", "classic", "editorial"]),
  primary_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondary_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent_color: z.string().regex(/^#[0-9a-f]{6}$/i),
  text_color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export type CardGeneration = z.infer<typeof outputSchema>;
export type AIProviderName = z.infer<typeof providerSchema>;

const DEFAULT_PROMPT = "Return only JSON matching this schema: {organization_name:string,member_name:string,membership_type:string,expiration_date:string|null,template:premium|modern|classic|editorial,primary_color:#rrggbb,secondary_color:#rrggbb,accent_color:#rrggbb,text_color:#rrggbb}. Preserve the supplied identity fields and choose an elegant accessible design.";

export class AIProviderError extends Error {
  constructor(public readonly code: "configuration" | "unavailable" | "timeout" | "invalid_output", message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

function config() {
  const provider = providerSchema.catch("groq").parse(process.env.AI_PROVIDER ?? "groq");
  if (provider === "groq" && !process.env.GROQ_API_KEY) throw new AIProviderError("configuration", "Groq is not configured.");
  if (provider === "ollama" && (!process.env.OLLAMA_BASE_URL || !process.env.OLLAMA_MODEL)) throw new AIProviderError("configuration", "Ollama requires OLLAMA_BASE_URL and OLLAMA_MODEL.");
  return provider;
}

async function request(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, headers: { "content-type": "application/json", ...init.headers } });
    if (!response.ok) throw new AIProviderError("unavailable", `AI provider returned HTTP ${response.status}.`);
    return response.json() as Promise<unknown>;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new AIProviderError("timeout", "AI provider timed out.");
    throw new AIProviderError("unavailable", "AI provider is unavailable.");
  } finally { clearTimeout(timer); }
}

function parseOutput(value: unknown): CardGeneration {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  const parsed = json ? JSON.parse(json) : null;
  const result = outputSchema.safeParse(parsed);
  if (!result.success) throw new AIProviderError("invalid_output", "AI returned an invalid card design.");
  return result.data;
}

export async function generateCard(input: Pick<CardGeneration, "organization_name" | "member_name" | "membership_type" | "expiration_date">) {
  const provider = config();
  const prompt = `${DEFAULT_PROMPT}\nInput JSON: ${JSON.stringify(input)}`;
  if (provider === "ollama") {
    const data = await request(`${process.env.OLLAMA_BASE_URL!.replace(/\/$/, "")}/api/chat`, { method: "POST", body: JSON.stringify({ model: process.env.OLLAMA_MODEL, stream: false, format: "json", messages: [{ role: "user", content: prompt }] }) }) as { message?: { content?: string } };
    return parseOutput(data.message?.content);
  }
  const data = await request("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile", temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: DEFAULT_PROMPT }, { role: "user", content: JSON.stringify(input) }] }) }) as { choices?: Array<{ message?: { content?: string } }> };
  return parseOutput(data.choices?.[0]?.message?.content);
}

export async function checkAIProvider() {
  try { const provider = config(); return { ok: true, provider }; } catch (error) { return { ok: false, error: error instanceof AIProviderError ? error.message : "AI provider is unavailable." }; }
}
