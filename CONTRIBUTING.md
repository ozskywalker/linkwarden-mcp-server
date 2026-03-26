# Contributing to linkwarden-mcp-server

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Getting Started

1. **Fork** the repository and clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/linkwarden-mcp-server.git
   cd linkwarden-mcp-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** — copy and fill in your Linkwarden details:
   ```bash
   export LINKWARDEN_BASE_URL=https://your-instance.com
   export LINKWARDEN_API_TOKEN=your-api-token
   ```

4. **Build and verify**:
   ```bash
   npm run build
   node dist/index.js  # Should print an env error if vars aren't set, or start the server
   ```

## Dev Workflow

Run the server in watch mode (auto-rebuilds on changes):

```bash
npm run dev
```

Test interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Project Structure

```
src/
  index.ts              # Entry point: server init, env validation, tool registration
  types.ts              # TypeScript interfaces for Linkwarden API models
  constants.ts          # Shared constants (CHARACTER_LIMIT, DEFAULT_PAGE_SIZE)
  services/
    client.ts           # Axios-based Linkwarden API client + error handling
  tools/
    links.ts            # Link CRUD tools
    collections.ts      # Collection CRUD tools
    tags.ts             # Tag tools
```

## Adding a New Tool

1. **Find the right file** — add to `src/tools/links.ts`, `collections.ts`, or `tags.ts` based on the resource type.

2. **Add an API method** to `src/services/client.ts` if needed — follow the existing pattern (typed return, error propagation).

3. **Register the tool** using `server.registerTool(name, config, handler)`:
   - Use a Zod schema with `.strict()` for `inputSchema`
   - Include `title`, `description`, and `annotations`
   - Set `readOnlyHint: true` for GET operations, `destructiveHint: true` for deletes
   - Support `response_format` (`markdown` | `json`) for data-returning tools
   - Return `{ content: [{ type: "text", text: ... }] }` from the handler

4. **Check CHARACTER_LIMIT** — truncate large responses with a clear message pointing to pagination.

Example skeleton:

```typescript
server.registerTool(
  "linkwarden_my_new_tool",
  {
    title: "My New Tool",
    description: `One-line summary. Detailed args and return schema here.`,
    inputSchema: z.object({
      id: z.number().int().describe("Resource ID"),
      response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params) => {
    try {
      const data = await myApiCall(params.id);
      return { content: [{ type: "text", text: formatResult(data, params.response_format) }] };
    } catch (error) {
      return { content: [{ type: "text", text: handleApiError(error) }] };
    }
  }
);
```

## Code Style

- **TypeScript strict mode** — no `any`, use `unknown` for caught errors
- **Zod schemas** — all tool inputs validated with `.strict()`
- **Error messages** — actionable, suggest what the user should try next
- **Response format** — always support both `markdown` (default) and `json`
- **DRY** — extract shared formatting logic into helper functions rather than copy-pasting

## Submitting a Pull Request

1. Create a branch: `git checkout -b feat/my-feature` or `fix/my-bug`
2. Make your changes and ensure `npm run build` succeeds with no errors
3. Open a PR against `main` with:
   - A clear description of what changed and why
   - Any new tools listed in the PR description
   - A note on how you tested it (MCP Inspector, Claude Code, etc.)

## Reporting Issues

Open an issue at [github.com/ozskywalker/linkwarden-mcp-server/issues](https://github.com/ozskywalker/linkwarden-mcp-server/issues) with:
- Your Linkwarden version
- The tool name and input that caused the issue
- The error message or unexpected output
