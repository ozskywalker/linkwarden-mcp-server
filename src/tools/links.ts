import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CHARACTER_LIMIT, DEFAULT_PAGE_SIZE } from "../constants.js";
import {
  createLink,
  deleteLink,
  getLink,
  handleApiError,
  listLinks,
  updateLink,
} from "../services/client.js";
import type { LinkwardenLink } from "../types.js";
import { ResponseFormat, SortOrder } from "../types.js";

// --- Formatters ---

function formatLinkMarkdown(link: LinkwardenLink): string {
  const lines: string[] = [];
  lines.push(`### [${link.name || link.url}](${link.url})`);
  lines.push(`- **ID**: ${link.id}`);
  lines.push(`- **Type**: ${link.type}`);
  if (link.description) lines.push(`- **Description**: ${link.description}`);
  if (link.collection) lines.push(`- **Collection**: ${link.collection.name} (ID: ${link.collection.id})`);
  else if (link.collectionId) lines.push(`- **Collection ID**: ${link.collectionId}`);
  if (link.tags && link.tags.length > 0) {
    lines.push(`- **Tags**: ${link.tags.map((t) => t.name).join(", ")}`);
  }
  lines.push(`- **Created**: ${new Date(link.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  lines.push(`- **Updated**: ${new Date(link.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  if (link.pinnedBy && link.pinnedBy.length > 0) lines.push(`- **Pinned**: Yes`);
  return lines.join("\n");
}

function formatLinksResponse(
  links: LinkwardenLink[],
  format: ResponseFormat,
  cursor?: number
): string {
  const nextCursor = links.length > 0 ? links[links.length - 1].id : undefined;
  const hasMore = links.length === DEFAULT_PAGE_SIZE;

  if (format === ResponseFormat.JSON) {
    const output = {
      count: links.length,
      cursor: cursor ?? null,
      next_cursor: hasMore ? nextCursor : null,
      has_more: hasMore,
      links: links.map((l) => ({
        id: l.id,
        name: l.name,
        url: l.url,
        type: l.type,
        description: l.description,
        collectionId: l.collectionId,
        collection: l.collection ? { id: l.collection.id, name: l.collection.name } : undefined,
        tags: l.tags?.map((t) => ({ id: t.id, name: t.name })) ?? [],
        pinned: (l.pinnedBy?.length ?? 0) > 0,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
    };
    return JSON.stringify(output, null, 2);
  }

  const lines: string[] = [`# Links (${links.length} results)`, ""];
  if (hasMore) {
    lines.push(`> Use \`cursor: ${nextCursor}\` to fetch the next page.`, "");
  }
  for (const link of links) {
    lines.push(formatLinkMarkdown(link));
    lines.push("");
  }
  return lines.join("\n");
}

// --- Tool Registration ---

export function registerLinkTools(server: McpServer): void {
  // list_links
  server.registerTool(
    "linkwarden_list_links",
    {
      title: "List Linkwarden Links",
      description: `Retrieve a paginated list of bookmarked links from Linkwarden, with optional filtering by collection, tag, pinned status, and full-text search.

Use this tool to browse links for summarization, newsletter building, or research. Supports cursor-based pagination — pass the returned next_cursor as the cursor parameter to retrieve the next page.

Args:
  - cursor (number, optional): Pagination cursor — use next_cursor from a previous response to get the next page
  - sort (number, optional): Sort order. 0=DateNewestFirst (default), 1=DateOldestFirst, 2=NameAZ, 3=NameZA
  - collection_id (number, optional): Filter to links in a specific collection
  - tag_id (number, optional): Filter to links with a specific tag (use linkwarden_list_tags to find tag IDs)
  - pinned_only (boolean, optional): If true, return only pinned links
  - search (string, optional): Full-text search query. Supports operators: name:, url:, tag:, before:YYYY-MM-DD, after:YYYY-MM-DD, collection:, description:, type:, pinned:true, and ! for negation
  - search_by_name (boolean, optional): Include link names in search (default: true)
  - search_by_url (boolean, optional): Include URLs in search (default: true)
  - search_by_description (boolean, optional): Include descriptions in search (default: true)
  - search_by_text_content (boolean, optional): Include archived text content in search
  - search_by_tags (boolean, optional): Include tag names in search
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns (JSON format):
  {
    "count": number,
    "cursor": number | null,
    "next_cursor": number | null,
    "has_more": boolean,
    "links": [{
      "id": number,
      "name": string,
      "url": string,
      "type": string,
      "description": string,
      "collectionId": number,
      "collection": { "id": number, "name": string } | undefined,
      "tags": [{ "id": number, "name": string }],
      "pinned": boolean,
      "createdAt": string,
      "updatedAt": string
    }]
  }

Examples:
  - Browse all links: no filters needed
  - Find recent AI links: search="tag:ai", sort=0
  - Get links added this year: search="after:2025-01-01"
  - Paginate: pass next_cursor from previous response as cursor`,
      inputSchema: z.object({
        cursor: z.number().int().optional().describe("Pagination cursor from a previous response's next_cursor"),
        sort: z.nativeEnum(SortOrder).default(SortOrder.DateNewestFirst).describe("0=DateNewestFirst, 1=DateOldestFirst, 2=NameAZ, 3=NameZA"),
        collection_id: z.number().int().optional().describe("Filter by collection ID"),
        tag_id: z.number().int().optional().describe("Filter by tag ID"),
        pinned_only: z.boolean().optional().describe("Return only pinned links"),
        search: z.string().optional().describe("Search query string. Supports operators: name:, url:, tag:, before:, after:, collection:, description:, type:, pinned:true"),
        search_by_name: z.boolean().default(true).describe("Search within link names"),
        search_by_url: z.boolean().default(true).describe("Search within URLs"),
        search_by_description: z.boolean().default(true).describe("Search within descriptions"),
        search_by_text_content: z.boolean().optional().describe("Search within archived text content (requires Meilisearch)"),
        search_by_tags: z.boolean().optional().describe("Search within tag names"),
        response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN).describe("'markdown' for readable output, 'json' for structured data"),
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
        const links = await listLinks({
          cursor: params.cursor,
          sort: params.sort,
          collectionId: params.collection_id,
          tagId: params.tag_id,
          pinnedOnly: params.pinned_only,
          searchQueryString: params.search,
          searchByName: params.search_by_name,
          searchByUrl: params.search_by_url,
          searchByDescription: params.search_by_description,
          searchByTextContent: params.search_by_text_content,
          searchByTags: params.search_by_tags,
        });

        let result = formatLinksResponse(links, params.response_format, params.cursor);
        if (result.length > CHARACTER_LIMIT) {
          const truncated = links.slice(0, Math.max(1, Math.floor(links.length / 2)));
          result = formatLinksResponse(truncated, params.response_format, params.cursor);
          result += "\n\n> Response truncated. Use pagination (cursor) or narrower filters.";
        }

        return { content: [{ type: "text", text: result }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // get_link
  server.registerTool(
    "linkwarden_get_link",
    {
      title: "Get Linkwarden Link",
      description: `Retrieve full details of a single Linkwarden bookmark by its numeric ID.

Args:
  - id (number, required): The link's numeric ID
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns complete link data including name, URL, description, collection, tags, archived formats, and timestamps.`,
      inputSchema: z.object({
        id: z.number().int().describe("Link ID"),
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
        const link = await getLink(params.id);
        if (params.response_format === ResponseFormat.JSON) {
          return { content: [{ type: "text", text: JSON.stringify(link, null, 2) }] };
        }
        return { content: [{ type: "text", text: formatLinkMarkdown(link) }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // create_link
  server.registerTool(
    "linkwarden_create_link",
    {
      title: "Create Linkwarden Link",
      description: `Save a new bookmark link to Linkwarden.

Args:
  - url (string, required): The URL to bookmark
  - name (string, optional): Display name — defaults to page title if omitted
  - description (string, optional): Description or notes about the link
  - collection_id (number, optional): Collection to save into (use linkwarden_list_collections to find IDs). Defaults to the user's default collection.
  - tags (array of strings, optional): Tag names to apply (e.g., ["ai", "research"])

Returns the created link object with its assigned ID.`,
      inputSchema: z.object({
        url: z.string().url().describe("URL to bookmark"),
        name: z.string().optional().describe("Display name for the link"),
        description: z.string().optional().describe("Description or notes"),
        collection_id: z.number().int().optional().describe("Collection ID to save into"),
        tags: z.array(z.string()).optional().describe("Tag names to apply"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const link = await createLink({
          url: params.url,
          name: params.name,
          description: params.description,
          collectionId: params.collection_id,
          tags: params.tags?.map((name) => ({ name })),
        });
        return {
          content: [{
            type: "text",
            text: `Link created (ID: ${link.id})\n\n${formatLinkMarkdown(link)}`,
          }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // update_link
  server.registerTool(
    "linkwarden_update_link",
    {
      title: "Update Linkwarden Link",
      description: `Update an existing Linkwarden bookmark. Use this for recategorizing links, renaming them, updating descriptions, changing collections, or modifying tags.

IMPORTANT: Tags are replaced wholesale — pass the complete desired tag list. To add a tag, first get the link with linkwarden_get_link, then pass all existing tags plus the new one. To remove a tag, omit it.

Args:
  - id (number, required): The link's numeric ID
  - name (string, optional): New display name
  - url (string, optional): New URL
  - description (string, optional): New description
  - collection_id (number, optional): Move to a different collection
  - tags (array of objects, optional): Complete replacement tag list. Each tag: { "id": number (optional), "name": string }
  - pinned (boolean, optional): Set pinned status

Returns the updated link.`,
      inputSchema: z.object({
        id: z.number().int().describe("Link ID to update"),
        name: z.string().optional().describe("New display name"),
        url: z.string().url().optional().describe("New URL"),
        description: z.string().optional().describe("New description"),
        collection_id: z.number().int().optional().describe("Move to this collection ID"),
        tags: z.array(z.object({
          id: z.number().int().optional().describe("Tag ID (omit for new tags)"),
          name: z.string().describe("Tag name"),
        })).optional().describe("Complete tag list (replaces existing tags)"),
        pinned: z.boolean().optional().describe("Set pinned status"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const payload: Parameters<typeof updateLink>[1] = {};
        if (params.name !== undefined) payload.name = params.name;
        if (params.url !== undefined) payload.url = params.url;
        if (params.description !== undefined) payload.description = params.description;
        if (params.collection_id !== undefined) payload.collectionId = params.collection_id;
        if (params.tags !== undefined) payload.tags = params.tags;

        const link = await updateLink(params.id, payload);
        return {
          content: [{
            type: "text",
            text: `Link updated (ID: ${link.id})\n\n${formatLinkMarkdown(link)}`,
          }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // delete_link
  server.registerTool(
    "linkwarden_delete_link",
    {
      title: "Delete Linkwarden Link",
      description: `Permanently delete a bookmark from Linkwarden. This action is irreversible.

Args:
  - id (number, required): The link's numeric ID to delete

Returns a confirmation message on success.`,
      inputSchema: z.object({
        id: z.number().int().describe("Link ID to delete"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        await deleteLink(params.id);
        return { content: [{ type: "text", text: `Link ${params.id} deleted successfully.` }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
