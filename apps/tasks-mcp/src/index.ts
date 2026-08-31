import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createRmtServer } from "./server.js";

serveStdio(() => createRmtServer(), {
  onerror: (error) => console.error(`[rmt-tasks-read] ${error.message}`),
});
