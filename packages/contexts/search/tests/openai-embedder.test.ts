import { describe, expect, test } from "bun:test";
import { createOpenAIEmbedder } from "../src/infrastructure/openai-embedder.ts";

describe("createOpenAIEmbedder", () => {
  test("posts to embeddings endpoint with text + model + auth", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fakeFetch = async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init as RequestInit });
      return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), {
        status: 200,
      });
    };
    const embedder = createOpenAIEmbedder({
      apiKey: "sk-test",
      fetch: fakeFetch as unknown as typeof fetch,
    });
    const vec = await embedder.embed("hello world");
    expect(vec).toEqual([0.1, 0.2, 0.3]);
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/embeddings");
    const body = JSON.parse(calls[0]?.init.body as string);
    expect(body.input).toBe("hello world");
    expect(body.model).toBe("text-embedding-3-small");
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe("Bearer sk-test");
  });

  test("throws on non-2xx response", async () => {
    const fakeFetch = async () => new Response("rate limited", { status: 429 });
    const embedder = createOpenAIEmbedder({
      apiKey: "sk",
      fetch: fakeFetch as unknown as typeof fetch,
    });
    await expect(embedder.embed("x")).rejects.toThrow(/429/);
  });

  test("throws when apiKey is empty", async () => {
    const embedder = createOpenAIEmbedder({ apiKey: "" });
    await expect(embedder.embed("x")).rejects.toThrow(/OPENAI_API_KEY/);
  });
});
