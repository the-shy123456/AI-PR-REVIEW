import { handleGitHubPullRequestRequest } from "../server/githubPullRequestCore.mjs";

export default async function handler(request, response) {
  if (!["GET", "POST"].includes(request.method)) {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const result = await handleGitHubPullRequestRequest({
      ...(request.method === "POST" ? request.body : request.query),
      cookieHeader: request.headers.cookie,
    });
    response.status(result.status).json(result.body);
  } catch (error) {
    response.status(500).json({
      error:
        error instanceof Error ? error.message : "GitHub PR import server error",
    });
  }
}
