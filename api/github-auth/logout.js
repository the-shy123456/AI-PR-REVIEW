import { createGitHubAuthLogoutResponse } from "../../server/githubAuthCore.mjs";

export default function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = createGitHubAuthLogoutResponse({
    origin: getRequestOrigin(request),
  });

  Object.entries(result.headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(result.status).json(result.body);
}

function getRequestOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host;

  return `${protocol}://${host}`;
}
