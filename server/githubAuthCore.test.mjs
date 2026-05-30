import { afterEach, describe, expect, it } from "vitest";
import {
  GITHUB_TOKEN_COOKIE,
  createGitHubAuthCallbackResponse,
  createGitHubAuthStartResponse,
  createGitHubAuthStatusResponse,
} from "./githubAuthCore.mjs";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("GitHub OAuth helpers", () => {
  it("builds a GitHub authorize redirect", () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";

    const result = createGitHubAuthStartResponse({
      origin: "http://127.0.0.1:5173",
      state: "state-1",
    });

    expect(result.status).toBe(302);
    expect(result.headers.Location).toContain("github.com/login/oauth/authorize");
    expect(result.headers.Location).toContain("client_id=client-id");
    expect(result.headers.Location).toContain("state=state-1");
    expect(result.headers["Set-Cookie"]).toContain(
      "ai_pr_review_github_oauth_state=state-1",
    );
  });

  it("exchanges callback code and returns a postMessage page", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const fetcher = async (_url, options) => {
      expect(String(options.body)).toContain("code=code-1");
      return new Response(JSON.stringify({ access_token: "gho_test" }), {
        status: 200,
      });
    };

    const result = await createGitHubAuthCallbackResponse(
      {
        code: "code-1",
        cookieHeader: "ai_pr_review_github_oauth_state=state-1",
        origin: "http://127.0.0.1:5173",
        state: "state-1",
      },
      fetcher,
    );

    expect(result.status).toBe(200);
    expect(result.body).toContain("ai-pr-review:github-auth");
    expect(result.body).toContain('"authenticated":true');
    expect(result.body).not.toContain("gho_test");
    expect(result.headers["Set-Cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining(`${GITHUB_TOKEN_COOKIE}=gho_test`)]),
    );
  });

  it("rejects callback state mismatches before exchanging the code", async () => {
    process.env.GITHUB_CLIENT_ID = "client-id";
    process.env.GITHUB_CLIENT_SECRET = "client-secret";
    const fetcher = async () => {
      throw new Error("should not exchange a mismatched state");
    };

    const result = await createGitHubAuthCallbackResponse(
      {
        code: "code-1",
        cookieHeader: "ai_pr_review_github_oauth_state=expected-state",
        origin: "http://127.0.0.1:5173",
        state: "different-state",
      },
      fetcher,
    );

    expect(result.status).toBe(200);
    expect(result.body).toContain("GitHub OAuth 状态校验失败");
  });

  it("reports whether the OAuth token cookie exists", () => {
    expect(
      createGitHubAuthStatusResponse({
        cookieHeader: `${GITHUB_TOKEN_COOKIE}=gho_test`,
      }),
    ).toEqual({
      body: { authorized: true },
      status: 200,
    });

    expect(createGitHubAuthStatusResponse({ cookieHeader: "" })).toEqual({
      body: { authorized: false },
      status: 200,
    });
  });
});
