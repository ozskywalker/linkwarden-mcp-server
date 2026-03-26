#!/usr/bin/env node
/**
 * MCP Server for Linkwarden — self-hosted bookmark manager.
 *
 * Provides tools to read, search, organize, and manage bookmarks via the
 * Linkwarden REST API.
 *
 * Required environment variables:
 *   LINKWARDEN_BASE_URL  — Base URL of your Linkwarden instance (e.g. https://linkwarden.example.com)
 *   LINKWARDEN_API_TOKEN — API token generated in Settings > Access Tokens
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRequire } from "module";
import { registerCollectionTools } from "./tools/collections.js";
import { registerLinkTools } from "./tools/links.js";
import { registerTagTools } from "./tools/tags.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

function validateEnv(): void {
  const missing: string[] = [];
  if (!process.env.LINKWARDEN_BASE_URL) missing.push("LINKWARDEN_BASE_URL");
  if (!process.env.LINKWARDEN_API_TOKEN) missing.push("LINKWARDEN_API_TOKEN");
  if (missing.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missing.join(", ")}`);
    console.error("  LINKWARDEN_BASE_URL  — e.g. https://linkwarden.example.com");
    console.error("  LINKWARDEN_API_TOKEN — generate at Settings > Access Tokens");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  validateEnv();

  const server = new McpServer({
    name: "linkwarden-mcp-server",
    version,
  });

  registerLinkTools(server);
  registerCollectionTools(server);
  registerTagTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Linkwarden MCP server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
