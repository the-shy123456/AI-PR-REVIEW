import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleAiReviewRequest } from "./server/aiReviewCore.mjs";

export default defineConfig({
  base: "./",
  plugins: [react(), aiReviewApiPlugin()],
});

function aiReviewApiPlugin() {
  return {
    configureServer(server) {
      server.middlewares.use("/api/ai-review", async (request, response) => {
        if (request.method !== "POST") {
          response.writeHead(405, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const payload = JSON.parse(await readBody(request));
          const result = await handleAiReviewRequest(payload);
          response.writeHead(result.status, { "Content-Type": "application/json" });
          response.end(JSON.stringify(result.body));
        } catch (error) {
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(
            JSON.stringify({
              error:
                error instanceof Error
                  ? error.message
                  : "AI Review server error",
            }),
          );
        }
      });
    },
    name: "ai-review-api",
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}
