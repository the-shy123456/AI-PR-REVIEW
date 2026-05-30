import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { ChangedFilesPanel } from "./components/ChangedFilesPanel";
import { MetricsGrid } from "./components/MetricsGrid";
import { ModelConfigPanel } from "./components/ModelConfigPanel";
import { PullRequestImporter } from "./components/PullRequestImporter";
import { ReviewPanel } from "./components/ReviewPanel";
import {
  requestAiCodeReview,
  type AiCodeReview,
  type LlmConfig,
} from "./lib/aiCodeReview";
import {
  importGitHubPullRequest,
  PullRequestImportError,
} from "./lib/githubPullRequest";
import { createMarkdownReport } from "./lib/markdownReport";
import { analyzePullRequest, type ReviewInput } from "./lib/reviewEngine";

type ReviewTab = "findings" | "ai";
const githubAuthMessageType = "ai-pr-review:github-auth";
const githubAuthStateStorageKey = "ai-pr-review.github-auth-state";
const githubAuthorizedStorageKey = "ai-pr-review.github-authorized";
const llmConfigStorageKey = "ai-pr-review.llm-config";
const defaultLlmConfig: LlmConfig = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "",
  protocol: "chat_completions",
};

export function App() {
  const [githubAuthorized, setGithubAuthorized] = useState(
    () => loadSessionValue(githubAuthorizedStorageKey) === "true",
  );
  const [prUrl, setPrUrl] = useState("");
  const [llmConfig, setLlmConfig] = useState<LlmConfig>(() => loadLlmConfig());
  const [pullRequest, setPullRequest] = useState<ReviewInput | null>(null);
  const [aiReview, setAiReview] = useState<AiCodeReview | null>(null);
  const [aiReviewError, setAiReviewError] = useState("");
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("findings");

  const report = useMemo(
    () => (pullRequest ? analyzePullRequest(pullRequest) : null),
    [pullRequest],
  );

  useEffect(() => {
    let cancelled = false;

    async function syncGitHubAuthStatus() {
      try {
        const response = await fetch("/api/github-auth/status", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { authorized?: boolean };
        if (!cancelled) {
          setGithubAuthorized(Boolean(payload.authorized));
          sessionStorage.setItem(
            githubAuthorizedStorageKey,
            payload.authorized ? "true" : "false",
          );
        }
      } catch {
        // Keep the optimistic session marker when the local API is unavailable.
      }
    }

    void syncGitHubAuthStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleGitHubAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as {
        error?: string;
        authenticated?: boolean;
        state?: string;
        type?: string;
      };
      const expectedState = sessionStorage.getItem(githubAuthStateStorageKey);

      if (
        payload?.type !== githubAuthMessageType ||
        !payload.state ||
        payload.state !== expectedState
      ) {
        return;
      }

      sessionStorage.removeItem(githubAuthStateStorageKey);

      if (payload.error || !payload.authenticated) {
        setError(payload.error || "GitHub 授权失败，请重试。");
        return;
      }

      setGithubAuthorized(true);
      sessionStorage.setItem(githubAuthorizedStorageKey, "true");
      setError("");
    }

    window.addEventListener("message", handleGitHubAuthMessage);
    return () => window.removeEventListener("message", handleGitHubAuthMessage);
  }, []);

  async function analyzeUrl() {
    setError("");
    setLoading(true);

    try {
      const imported = await importGitHubPullRequest(prUrl);
      setPullRequest(imported);
      setAiReview(null);
      setAiReviewError("");
      setActiveTab("findings");
    } catch (caught) {
      const message =
        caught instanceof PullRequestImportError
          ? caught.message
          : "导入失败，请确认该 GitHub PR 公开可访问。";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function clearAnalysis() {
    setPrUrl("");
    setPullRequest(null);
    setAiReview(null);
    setAiReviewError("");
    setError("");
  }

  function loginWithGitHub() {
    const state =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(githubAuthStateStorageKey, state);
    const authUrl = `/api/github-auth/start?state=${encodeURIComponent(state)}`;
    const popup = window.open(
      authUrl,
      "github-auth",
      "popup=yes,width=720,height=760",
    );

    if (!popup) {
      window.location.href = authUrl;
    }
  }

  async function logoutGitHub() {
    setGithubAuthorized(false);
    sessionStorage.removeItem(githubAuthorizedStorageKey);
    sessionStorage.removeItem(githubAuthStateStorageKey);
    await fetch("/api/github-auth/logout", {
      credentials: "same-origin",
      method: "POST",
    }).catch(() => undefined);
  }

  async function analyzeCodeWithAi() {
    if (!pullRequest || !report) {
      return;
    }

    setAiReviewError("");
    setAiReviewLoading(true);
    setActiveTab("ai");

    try {
      setAiReview(await requestAiCodeReview(pullRequest, report, llmConfig));
    } catch (caught) {
      setAiReviewError(
        caught instanceof Error
          ? caught.message
          : "AI 代码评审失败，请稍后重试。",
      );
    } finally {
      setAiReviewLoading(false);
    }
  }

  function downloadReport() {
    if (!pullRequest || !report) {
      return;
    }

    const markdown = createMarkdownReport(pullRequest, report, aiReview);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(pullRequest.title) || "pr-review-report"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <AppHeader
        canDownload={Boolean(report)}
        onClear={clearAnalysis}
        onDownload={downloadReport}
      />
      {report ? (
        <MetricsGrid report={report} />
      ) : (
        <section className="empty-analysis">
          <strong>等待 GitHub PR 链接</strong>
          <p>输入公开 PR 地址后，系统会自动拉取 PR 元数据和 diff 并开始审查。</p>
        </section>
      )}
      <section className="workbench">
        <div className="left-stack">
          <PullRequestImporter
            error={error}
            githubAuthorized={githubAuthorized}
            loading={loading}
            onAnalyze={analyzeUrl}
            onGithubLogin={loginWithGitHub}
            onGithubLogout={logoutGitHub}
            onUrlChange={setPrUrl}
            sourceUrl={pullRequest?.sourceUrl}
            title={pullRequest?.title}
            url={prUrl}
          />
          <ModelConfigPanel
            config={llmConfig}
            onChange={(nextConfig) => {
              setLlmConfig(nextConfig);
              sessionStorage.setItem(
                llmConfigStorageKey,
                JSON.stringify(nextConfig),
              );
            }}
          />
        </div>
        {report && pullRequest ? (
          <ReviewPanel
            activeTab={activeTab}
            aiReview={aiReview}
            aiReviewError={aiReviewError}
            aiReviewLoading={aiReviewLoading}
            onAiReview={analyzeCodeWithAi}
            onTabChange={setActiveTab}
            report={report}
          />
        ) : (
          <section className="review-panel placeholder-panel">
            <h2>PR 分析结果</h2>
            <p>这里会显示风险评分、审查意见、AI 代码评审和合并建议。</p>
          </section>
        )}
        <ChangedFilesPanel files={report?.changedFiles ?? []} />
      </section>
    </main>
  );
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function loadSessionValue(key: string) {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function loadLlmConfig(): LlmConfig {
  try {
    const saved = sessionStorage.getItem(llmConfigStorageKey);
    return saved
      ? {
          ...defaultLlmConfig,
          ...JSON.parse(saved),
        }
      : defaultLlmConfig;
  } catch {
    return defaultLlmConfig;
  }
}
