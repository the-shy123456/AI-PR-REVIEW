import { describe, expect, it } from "vitest";
import { handleGitHubPullRequestRequest } from "./githubPullRequestCore.mjs";

describe("handleGitHubPullRequestRequest", () => {
  it("uses request GitHub token for metadata and diff API calls", async () => {
    const calls = [];
    const fetcher = async (url, options) => {
      calls.push({ options, url });
      if (String(options?.headers?.Accept).includes("json")) {
        return new Response(
          JSON.stringify({
            body: "authorized body",
            html_url: "https://github.com/acme/app/pull/7",
            title: "feat: authorized import",
          }),
          { status: 200 },
        );
      }

      return new Response("diff --git a/a b/a", { status: 200 });
    };

    await expect(
      handleGitHubPullRequestRequest(
        {
          githubToken: "github_pat_test",
          owner: "acme",
          pullNumber: "7",
          repo: "app",
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        description: "authorized body",
        title: "feat: authorized import",
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.options.headers.Authorization === "Bearer github_pat_test")).toBe(
      true,
    );
  });

  it("uses the OAuth session cookie for GitHub API calls", async () => {
    const calls = [];
    const fetcher = async (url, options) => {
      calls.push({ options, url });
      if (String(options?.headers?.Accept).includes("json")) {
        return new Response(
          JSON.stringify({
            body: "cookie body",
            html_url: "https://github.com/acme/app/pull/10",
            title: "feat: cookie import",
          }),
          { status: 200 },
        );
      }

      return new Response("diff --git a/a b/a", { status: 200 });
    };

    await expect(
      handleGitHubPullRequestRequest(
        {
          cookieHeader: "ai_pr_review_github_token=gho_cookie",
          owner: "acme",
          pullNumber: "10",
          repo: "app",
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        description: "cookie body",
        title: "feat: cookie import",
      },
    });

    expect(calls).toHaveLength(2);
    expect(
      calls.every((call) => call.options.headers.Authorization === "Bearer gho_cookie"),
    ).toBe(true);
  });

  it("continues when metadata is rate limited but public diff is available", async () => {
    const fetcher = async (url) => {
      if (String(url).includes("api.github.com")) {
        return new Response("rate limited", { status: 403 });
      }

      return new Response("diff --git a/a b/a", { status: 200 });
    };

    await expect(
      handleGitHubPullRequestRequest(
        {
          owner: "acme",
          pullNumber: "7",
          repo: "app",
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        description: "",
        sourceUrl: "https://github.com/acme/app/pull/7",
        title: "acme/app#7",
      },
    });
  });

  it("continues when metadata fetch fails but diff is available", async () => {
    const fetcher = async (url, options) => {
      if (String(options?.headers?.Accept).includes("json")) {
        throw new Error("network error");
      }

      return new Response("diff --git a/a b/a", { status: 200 });
    };

    await expect(
      handleGitHubPullRequestRequest(
        {
          owner: "acme",
          pullNumber: "8",
          repo: "app",
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        description: "",
        sourceUrl: "https://github.com/acme/app/pull/8",
        title: "acme/app#8",
      },
    });
  });

  it("falls back to the GitHub API diff when public diff fetch fails", async () => {
    const fetcher = async (url, options) => {
      const accept = String(options?.headers?.Accept);

      if (accept.includes("json")) {
        return new Response("rate limited", { status: 403 });
      }

      if (String(url).endsWith(".diff")) {
        throw new Error("public diff failed");
      }

      return new Response("diff --git a/src/app.ts b/src/app.ts", {
        status: 200,
      });
    };

    await expect(
      handleGitHubPullRequestRequest(
        {
          owner: "acme",
          pullNumber: "9",
          repo: "app",
        },
        fetcher,
      ),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        diff: "diff --git a/src/app.ts b/src/app.ts",
        title: "acme/app#9",
      },
    });
  });
});
