import { createGitHubAuthStatusResponse } from "../../server/githubAuthCore.mjs";

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = createGitHubAuthStatusResponse({
    cookieHeader: request.headers.cookie,
  });
  response.status(result.status).json(result.body);
}
