import { createGitHubAuthStartResponse } from "../../server/githubAuthCore.mjs";

export default function handler(request, response) {
  const origin = getRequestOrigin(request);
  const result = createGitHubAuthStartResponse({
    origin,
    state: request.query.state,
  });

  Object.entries(result.headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  response.status(result.status).send(result.body || "");
}

function getRequestOrigin(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host;

  return `${protocol}://${host}`;
}
