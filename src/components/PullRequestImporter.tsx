import { Github, LogIn, LogOut, Loader2, Search, ShieldCheck } from "lucide-react";

interface PullRequestImporterProps {
  error: string;
  githubAuthorized: boolean;
  loading: boolean;
  onAnalyze: () => void;
  onGithubLogin: () => void;
  onGithubLogout: () => void;
  onUrlChange: (value: string) => void;
  sourceUrl?: string;
  title?: string;
  url: string;
}

export function PullRequestImporter({
  error,
  githubAuthorized,
  loading,
  onAnalyze,
  onGithubLogin,
  onGithubLogout,
  onUrlChange,
  sourceUrl,
  title,
  url,
}: PullRequestImporterProps) {
  return (
    <aside className="input-panel" aria-label="pull request importer">
      <div className="panel-heading">
        <h2>PR 链接</h2>
        <span>GitHub 公开 PR</span>
      </div>
      <section className="import-card">
        <Github size={28} />
        <div>
          <strong>粘贴 GitHub PR 链接后自动分析</strong>
          <p>
            登录 GitHub 后使用授权访问，避免匿名接口限流导致公开 PR 读取失败。
          </p>
        </div>
      </section>
      <label>
        GitHub PR URL
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onAnalyze();
            }
          }}
          placeholder="https://github.com/owner/repo/pull/123"
        />
      </label>
      <section className="github-auth-panel">
        <div>
          {githubAuthorized ? <ShieldCheck size={18} /> : <Github size={18} />}
          <span>{githubAuthorized ? "GitHub 已授权" : "GitHub 未授权"}</span>
        </div>
        {githubAuthorized ? (
          <button onClick={onGithubLogout} type="button">
            <LogOut size={16} /> 退出
          </button>
        ) : (
          <button onClick={onGithubLogin} type="button">
            <LogIn size={16} /> 登录 GitHub
          </button>
        )}
      </section>
      <button
        className="primary-action"
        disabled={loading || !url.trim()}
        onClick={onAnalyze}
        type="button"
      >
        {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
        {loading ? "正在拉取 PR" : "分析 PR"}
      </button>
      {error && <p className="error-note">{error}</p>}
      {sourceUrl && (
        <section className="imported-pr">
          <span>当前 PR</span>
          <strong>{title}</strong>
          <a href={sourceUrl} rel="noreferrer" target="_blank">
            打开 GitHub PR
          </a>
        </section>
      )}
    </aside>
  );
}
