import { GITHUB_TOKEN_COOKIE, readCookie } from "./githubAuthCore.mjs";

const DEFAULT_MODE = "competition";

export async function handleGitHubPullRequestRequest(params, fetcher = fetch) {
  const ref = normalizePullRequestRef(params);

  if (!ref) {
    return {
      status: 400,
      body: { error: "缺少 owner、repo 或 pullNumber。" },
    };
  }

  const [metadataResult, diffResult] = await Promise.all([
    fetchPullRequestMetadata(ref, fetcher),
    fetchPullRequestDiff(ref, fetcher),
  ]);

  if (!diffResult.ok) {
    return {
      status: diffResult.status,
      body: {
        error: `无法读取 PR diff，GitHub 返回 ${diffResult.status}。请确认该 PR 公开可访问。`,
      },
    };
  }

  const metadata = metadataResult.ok ? metadataResult.value : null;

  return {
    status: 200,
    body: {
      description: metadata?.body ?? "",
      diff: diffResult.value,
      mode: DEFAULT_MODE,
      sourceUrl: metadata?.html_url ?? ref.url,
      title: metadata?.title || `${ref.owner}/${ref.repo}#${ref.pullNumber}`,
    },
  };
}

function normalizePullRequestRef(params) {
  const owner = clean(params?.owner);
  const repo = clean(params?.repo);
  const pullNumber = Number(params?.pullNumber);

  if (!owner || !repo || !Number.isInteger(pullNumber) || pullNumber <= 0) {
    return null;
  }

  return {
    owner,
    repo,
    pullNumber,
    token: resolveGitHubToken(params),
    url: `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
  };
}

function resolveGitHubToken(params) {
  return (
    clean(params?.githubToken) ||
    readCookie(params?.cookieHeader, GITHUB_TOKEN_COOKIE)
  );
}

async function fetchPullRequestMetadata(ref, fetcher) {
  const response = await safeFetch(fetcher,
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.pullNumber}`,
    { headers: buildGitHubHeaders("application/vnd.github+json", ref.token) },
  );

  if (!response) {
    return { ok: false, status: 502 };
  }

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return {
    ok: true,
    value: await response.json(),
  };
}

async function fetchPullRequestDiff(ref, fetcher) {
  if (ref.token) {
    const authorizedDiff = await fetchApiDiff(ref, fetcher);
    if (authorizedDiff.ok) {
      return authorizedDiff;
    }
  }

  const publicDiff = await safeFetch(fetcher, `${ref.url}.diff`, {
    headers: { Accept: "text/plain" },
  });

  if (publicDiff?.ok) {
    const diff = await publicDiff.text();
    if (diff.trim()) {
      return { ok: true, value: diff };
    }
  }

  return fetchApiDiff(ref, fetcher);
}

async function fetchApiDiff(ref, fetcher) {
  const response = await safeFetch(fetcher,
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/pulls/${ref.pullNumber}`,
    { headers: buildGitHubHeaders("application/vnd.github.v3.diff", ref.token) },
  );

  if (!response) {
    return { ok: false, status: 502 };
  }

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const diff = await response.text();
  return diff.trim()
    ? { ok: true, value: diff }
    : { ok: false, status: 422 };
}

async function safeFetch(fetcher, url, options) {
  try {
    return await fetcher(url, options);
  } catch {
    return null;
  }
}

function buildGitHubHeaders(accept, requestToken) {
  const headers = {
    Accept: accept,
    "User-Agent": "AI-PR-Review-Assistant",
  };
  const token = clean(requestToken) || clean(process.env.GITHUB_TOKEN);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}
