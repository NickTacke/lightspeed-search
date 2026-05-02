export interface OpenAIEmbedder {
  embed(text: string): Promise<number[]>;
}

export interface OpenAIEmbedderConfig {
  apiKey: string;
  model?: string;
  fetch?: typeof fetch;
}

export function createOpenAIEmbedder(config: OpenAIEmbedderConfig): OpenAIEmbedder {
  const fetchImpl = config.fetch ?? fetch;
  const model = config.model ?? "text-embedding-3-small";
  return {
    async embed(text: string): Promise<number[]> {
      if (!config.apiKey) throw new Error("OPENAI_API_KEY is not set");
      const res = await fetchImpl("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ input: text, model }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI embed ${res.status}: ${body}`);
      }
      const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
      const vec = data.data[0]?.embedding;
      if (!vec) throw new Error("OpenAI returned no embedding");
      return vec;
    },
  };
}
