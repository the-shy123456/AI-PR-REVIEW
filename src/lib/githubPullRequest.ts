import type { ReviewInput } from "./reviewEngine";

export interface GitHubPullRequestRef {
  owner: string;
  repo: string;
  pullNumber: number;
  url: string;
}

export class PullRequestImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PullRequestImportError";
  }
}

export function parseGitHubPullRequestUrl(value: string): GitHubPullRequestRef {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new PullRequestImportError("请输入有效的 GitHub PR 链接。");
  }

  if (url.hostname !== "github.com") {
    throw new PullRequestImportError("目前只支持 github.com 的公开 PR 链接。");
  }

  const [, owner, repo, pullSegment, numberSegment] = url.pathname.split("/");
  const pullNumber = Number(numberSegment);

  if (!owner || !repo || pullSegment !== "pull" || !Number.isInteger(pullNumber)) {
    throw new PullRequestImportError(
      "链接格式应类似：https://github.com/owner/repo/pull/123",
    );
  }

  return {
    owner,
    repo,
    pullNumber,
    url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
  };
}

export async function fetchGitHubPullRequest(
  ref: GitHubPullRequestRef,
  fetcher: typeof fetch = fetch,
): Promise<ReviewInput> {
  const response = await fetcher("/api/github-pr", {
    body: JSON.stringify({
      owner: ref.owner,
      pullNumber: ref.pullNumber,
      repo: ref.repo,
    }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new PullRequestImportError(
      payload.error ||
        `无法读取 PR，导入服务返回 ${response.status}。请确认仓库和 PR 公开可访问。`,
    );
  }

  return (await response.json()) as ReviewInput;
}

export async function importGitHubPullRequest(
  value: string,
  fetcher: typeof fetch = fetch,
): Promise<ReviewInput> {
  const ref = parseGitHubPullRequestUrl(value);
  return fetchGitHubPullRequest(ref, fetcher);
}

async function safeJson(response: Response): Promise<{ error?: string }> {
  try {
    return (await response.json()) as { error?: string };
  } catch {
    return {};
  }
}
