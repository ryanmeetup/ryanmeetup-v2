# Ryan Meetup Tasks MCP

Local, read-only MCP server for Claude Desktop. It proxies validated tool calls
to the private RMT Tasks read API and never receives a Supabase credential.

See [`../tasks/docs/MCP.md`](../tasks/docs/MCP.md) for the data boundary,
deployment configuration, token rotation, bundle installation, and validation
workflow.

## Commands

```sh
npm run typecheck
npm test
npm run build
npm run pack:mcpb
```
