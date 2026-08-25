import { createServer } from "node:http";

const port = Number(process.env.PLAYWRIGHT_SUPABASE_PORT ?? 54329);

const json = (response, status, body) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (url.pathname === "/health") {
    json(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/rest/v1/instance_settings") {
    json(response, 200, {});
    return;
  }

  if (url.pathname === "/auth/v1/user") {
    json(response, 401, { message: "Auth session missing" });
    return;
  }

  json(response, 404, { message: "Not found" });
});

server.listen(port, "127.0.0.1");

const close = () => server.close(() => process.exit(0));
process.on("SIGINT", close);
process.on("SIGTERM", close);
