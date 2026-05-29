import { describe, expect, it } from "vitest";
import {
  buildChatCompletionsUrl,
  buildModelEndpoint,
  handleAiReviewRequest,
} from "./aiReviewCore.mjs";

describe("buildChatCompletionsUrl", () => {
  it("appends chat completions path to OpenAI-compatible base URLs", () => {
    expect(buildChatCompletionsUrl("https://api.example.com/v1")).toBe(
      "https://api.example.com/v1/chat/completions",
    );
  });

  it("keeps full chat completions URLs", () => {
    expect(
      buildChatCompletionsUrl("https://api.example.com/v1/chat/completions"),
    ).toBe("https://api.example.com/v1/chat/completions");
  });
});

describe("buildModelEndpoint", () => {
  it("builds Responses API URLs", () => {
    expect(
      buildModelEndpoint({
        baseUrl: "https://api.openai.com/v1",
        protocol: "responses",
      }),
    ).toBe("https://api.openai.com/v1/responses");
  });

  it("converts explicit endpoint URLs when switching protocols", () => {
    expect(
      buildModelEndpoint({
        baseUrl: "https://api.example.com/v1/chat/completions",
        protocol: "responses",
      }),
    ).toBe("https://api.example.com/v1/responses");

    expect(
      buildModelEndpoint({
        baseUrl: "https://api.example.com/v1/responses",
        protocol: "chat_completions",
      }),
    ).toBe("https://api.example.com/v1/chat/completions");
  });
});

describe("handleAiReviewRequest", () => {
  it("calls configured third-party model endpoint", async () => {
    const fetcher = async (url, options) => {
      expect(url).toBe("https://api.example.com/v1/chat/completions");
      expect(options.headers.Authorization).toBe("Bearer sk-test");
      const body = JSON.parse(options.body);
      expect(body.model).toBe("third-party-model");
      expect(body.response_format).toEqual({ type: "json_object" });
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  codeQualityScore: 88,
                  dimensions: [
                    { name: "完整性", score: 86, assessment: "覆盖较完整。" },
                  ],
                  findings: [],
                  mergeRecommendation: "comment",
                  mergeRecommendationText: "补充测试后合并。",
                  positiveNotes: ["结构清晰"],
                  summary: "整体质量较好。",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    };

    await expect(
      handleAiReviewRequest(
        {
          input: {
            title: "feat: demo",
            description: "demo",
            diff: "diff --git a/a b/a",
          },
          llmConfig: {
            apiKey: "sk-test",
            baseUrl: "https://api.example.com/v1",
            model: "third-party-model",
            protocol: "chat_completions",
          },
          ruleReport: { findings: [] },
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        codeQualityScore: 88,
        mergeRecommendation: "comment",
      },
    });
  });

  it("calls OpenAI Responses API and parses output text", async () => {
    const fetcher = async (url, options) => {
      expect(url).toBe("https://api.openai.com/v1/responses");
      expect(options.headers.Authorization).toBe("Bearer sk-test");
      const body = JSON.parse(options.body);
      expect(body.model).toBe("gpt-4.1-mini");
      expect(body.input).toHaveLength(2);
      expect(body.text.format).toMatchObject({
        name: "ai_code_review",
        strict: true,
        type: "json_schema",
      });
      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            codeQualityScore: 91,
            dimensions: [
              { name: "安全性", score: 92, assessment: "未发现明显漏洞。" },
            ],
            findings: [],
            mergeRecommendation: "approve",
            mergeRecommendationText: "可以合并。",
            positiveNotes: ["边界处理清晰"],
            summary: "代码质量稳定。",
          }),
        }),
        { status: 200 },
      );
    };

    await expect(
      handleAiReviewRequest(
        {
          input: {
            title: "feat: demo",
            description: "demo",
            diff: "diff --git a/a b/a",
          },
          llmConfig: {
            apiKey: "sk-test",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4.1-mini",
            protocol: "responses",
          },
          ruleReport: { findings: [] },
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        codeQualityScore: 91,
        mergeRecommendation: "approve",
      },
    });
  });
});
