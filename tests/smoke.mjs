#!/usr/bin/env node
/**
 * Smoke test for linkwarden-mcp-server.
 *
 * Spawns the built server over stdio, runs the MCP handshake, asserts the tool
 * surface, and exercises read-only tools against a live Linkwarden instance.
 *
 * Required env:
 *   LINKWARDEN_API_TOKEN  Linkwarden API token
 *   LINKWARDEN_BASE_URL   e.g. https://linkwarden.longbranch.lwalker.me
 *
 * Exit codes: 0 pass, 1 assertion failure, 2 missing env / spawn failure.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const EXPECTED_TOOLS = [
  "linkwarden_create_collection",
  "linkwarden_create_link",
  "linkwarden_delete_collection",
  "linkwarden_delete_link",
  "linkwarden_delete_tag",
  "linkwarden_get_link",
  "linkwarden_list_collections",
  "linkwarden_list_links",
  "linkwarden_list_tags",
  "linkwarden_rename_tag",
  "linkwarden_update_collection",
  "linkwarden_update_link",
];

const fails = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fails.push(name);
}

const token = process.env.LINKWARDEN_API_TOKEN;
const baseUrl = process.env.LINKWARDEN_BASE_URL;
if (!token || !baseUrl) {
  console.error("missing LINKWARDEN_API_TOKEN and/or LINKWARDEN_BASE_URL");
  process.exit(2);
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [new URL("../dist/index.js", import.meta.url).pathname],
  env: { ...process.env },
  stderr: "pipe",
});

let client;
try {
  client = new Client({ name: "linkwarden-smoke", version: "1.0.1" }, { capabilities: {} });
  await client.connect(transport);
  check("stdio handshake (initialize)", true, `server=${client.getServerVersion()?.name}@${client.getServerVersion()?.version}`);
} catch (err) {
  console.error("spawn/initialize failed:", err?.message ?? err);
  process.exit(2);
}

try {
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  check("tools/list count == 12", names.length === 12, `got ${names.length}`);
  const missing = EXPECTED_TOOLS.filter((n) => !names.includes(n));
  check("tool surface matches", missing.length === 0, missing.length ? `missing ${missing.join(",")}` : "all present");
  const noSchema = tools.filter((t) => !t.inputSchema || t.inputSchema.type !== "object").map((t) => t.name);
  check("every tool has an object inputSchema", noSchema.length === 0, noSchema.join(",") || "ok");

  // Read-only live calls
  const collections = await client.callTool({ name: "linkwarden_list_collections", arguments: { response_format: "json" } });
  const cText = collections.content?.map((c) => c.text ?? "").join("\n") ?? "";
  let cJson;
  try {
    cJson = JSON.parse(cText);
  } catch {
    cJson = null;
  }
  check("list_collections returns JSON", !!cJson, cText.slice(0, 120).replace(/\n/g, " "));
  const cArr = Array.isArray(cJson) ? cJson : cJson?.data;
  check("list_collections returned >=1 collection", Array.isArray(cArr) && cArr.length > 0, `${Array.isArray(cArr) ? cArr.length : "?"} collections`);
  check("collection shape (id+name)", Array.isArray(cArr) && cArr.every((c) => typeof c?.id === "number" && typeof c?.name === "string"), "");

  const tags = await client.callTool({ name: "linkwarden_list_tags", arguments: { response_format: "json" } });
  const tText = tags.content?.map((c) => c.text ?? "").join("\n") ?? "";
  let tJson;
  try {
    tJson = JSON.parse(tText);
  } catch {
    tJson = null;
  }
  check("list_tags returns JSON array", Array.isArray(tJson) && tJson.length > 0, `${Array.isArray(tJson) ? tJson.length : "?"} tags`);
  check("tag shape (id+name)", Array.isArray(tJson) && tJson.every((t) => typeof t?.id === "number" && typeof t?.name === "string"), "");

  // list_links returns a paginated envelope: {count, cursor, next_cursor, has_more, links[]}
  const links = await client.callTool({ name: "linkwarden_list_links", arguments: { response_format: "json" } });
  const lText = links.content?.map((c) => c.text ?? "").join("\n") ?? "";
  let lJson;
  try {
    lJson = JSON.parse(lText);
  } catch {
    lJson = null;
  }
  check("list_links returns JSON", !!lJson, lText.slice(0, 120).replace(/\n/g, " "));
  check("list_links envelope shape", !!lJson && Array.isArray(lJson.links) && typeof lJson.count === "number" && typeof lJson.has_more === "boolean", lJson ? `count=${lJson.count} has_more=${lJson.has_more}` : "");
  const lArr = lJson?.links ?? [];
  check("links carry numeric id", lArr.length > 0 && lArr.every((l) => typeof l?.id === "number"), `${lArr.length} links`);
  const urlLinks = lArr.filter((l) => l?.type === "url");
  check("url-type links carry a url", urlLinks.length > 0 && urlLinks.every((l) => typeof l?.url === "string" && l.url.length > 0), `${urlLinks.length} url-type`);

  // Enum validation must be enforced by the zod schema (zod v4 behaviour check)
  let rejected = false;
  try {
    const bad = await client.callTool({ name: "linkwarden_list_links", arguments: { sort: 99 } });
    rejected = bad.isError === true;
  } catch {
    rejected = true;
  }
  check("invalid enum rejected by schema validation", rejected, "sort=99");

  // Read a single link if any exist (exercises get_link)
  const firstId = lArr[0]?.id;
  if (typeof firstId === "number") {
    const one = await client.callTool({ name: "linkwarden_get_link", arguments: { id: firstId, response_format: "json" } });
    check("get_link on a real id", !one.isError, `id=${firstId}`);
  } else {
    console.log("SKIP  get_link — no links in account");
  }
} catch (err) {
  check("live tool calls", false, err?.message ?? String(err));
} finally {
  await client.close().catch(() => {});
}

console.log(fails.length ? `\n${fails.length} check(s) FAILED` : "\nall checks passed");
process.exit(fails.length ? 1 : 0);
