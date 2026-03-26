import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createCollection,
  deleteCollection,
  handleApiError,
  listCollections,
  updateCollection,
} from "../services/client.js";
import type { LinkwardenCollection } from "../types.js";
import { ResponseFormat } from "../types.js";

// --- Formatters ---

function formatCollectionMarkdown(col: LinkwardenCollection): string {
  const lines: string[] = [];
  lines.push(`### ${col.name} (ID: ${col.id})`);
  if (col.description) lines.push(`- **Description**: ${col.description}`);
  if (col.parentId) lines.push(`- **Parent ID**: ${col.parentId}`);
  lines.push(`- **Public**: ${col.isPublic ? "Yes" : "No"}`);
  if (col.color) lines.push(`- **Color**: ${col.color}`);
  lines.push(`- **Created**: ${new Date(col.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
  return lines.join("\n");
}

// --- Tool Registration ---

export function registerCollectionTools(server: McpServer): void {
  // list_collections
  server.registerTool(
    "linkwarden_list_collections",
    {
      title: "List Linkwarden Collections",
      description: `Retrieve all collections (folders) in the user's Linkwarden account.

Collections are used to organize bookmarks. Use this tool to discover available collections before filtering links or moving links between collections.

Args:
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns (JSON format):
  [{
    "id": number,
    "name": string,
    "description": string | null,
    "color": string | null,
    "parentId": number | null,
    "isPublic": boolean,
    "ownerId": number,
    "createdAt": string,
    "updatedAt": string
  }]`,
      inputSchema: z.object({
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
        const collections = await listCollections();
        if (params.response_format === ResponseFormat.JSON) {
          return { content: [{ type: "text", text: JSON.stringify(collections, null, 2) }] };
        }

        if (collections.length === 0) {
          return { content: [{ type: "text", text: "No collections found." }] };
        }

        const lines = [`# Collections (${collections.length})`, ""];
        // Group by parent for readability
        const topLevel = collections.filter((c) => !c.parentId);
        const children = collections.filter((c) => c.parentId);

        for (const col of topLevel) {
          lines.push(formatCollectionMarkdown(col));
          const subs = children.filter((c) => c.parentId === col.id);
          for (const sub of subs) {
            lines.push(`  ` + formatCollectionMarkdown(sub).replace(/\n/g, "\n  "));
          }
          lines.push("");
        }

        // Any orphaned children
        const listedParentIds = new Set(topLevel.map((c) => c.id));
        for (const col of children) {
          if (!listedParentIds.has(col.parentId!)) {
            lines.push(formatCollectionMarkdown(col));
            lines.push("");
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // create_collection
  server.registerTool(
    "linkwarden_create_collection",
    {
      title: "Create Linkwarden Collection",
      description: `Create a new collection (folder) in Linkwarden to organize bookmarks.

Args:
  - name (string, required): Collection name
  - description (string, optional): Description
  - color (string, optional): Hex color code (e.g., "#3b82f6")
  - parent_id (number, optional): Parent collection ID to create a subcollection
  - is_public (boolean, optional): Whether the collection is publicly shareable

Returns the created collection object.`,
      inputSchema: z.object({
        name: z.string().min(1).describe("Collection name"),
        description: z.string().optional().describe("Collection description"),
        color: z.string().optional().describe("Hex color code (e.g. #3b82f6)"),
        parent_id: z.number().int().optional().describe("Parent collection ID for subcollections"),
        is_public: z.boolean().optional().describe("Whether the collection is publicly shareable"),
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
        const col = await createCollection({
          name: params.name,
          description: params.description,
          color: params.color,
          parentId: params.parent_id,
          isPublic: params.is_public,
        });
        return {
          content: [{
            type: "text",
            text: `Collection created (ID: ${col.id})\n\n${formatCollectionMarkdown(col)}`,
          }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // update_collection
  server.registerTool(
    "linkwarden_update_collection",
    {
      title: "Update Linkwarden Collection",
      description: `Update an existing Linkwarden collection's name, description, color, or visibility.

Args:
  - id (number, required): Collection ID to update
  - name (string, optional): New name
  - description (string, optional): New description
  - color (string, optional): New hex color code
  - parent_id (number, optional): New parent collection ID (to re-nest)
  - is_public (boolean, optional): Change public visibility

Returns the updated collection.`,
      inputSchema: z.object({
        id: z.number().int().describe("Collection ID to update"),
        name: z.string().optional().describe("New name"),
        description: z.string().optional().describe("New description"),
        color: z.string().optional().describe("New hex color code"),
        parent_id: z.number().int().optional().describe("New parent collection ID"),
        is_public: z.boolean().optional().describe("Change public visibility"),
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
        const payload: Parameters<typeof updateCollection>[1] = {};
        if (params.name !== undefined) payload.name = params.name;
        if (params.description !== undefined) payload.description = params.description;
        if (params.color !== undefined) payload.color = params.color;
        if (params.parent_id !== undefined) payload.parentId = params.parent_id;
        if (params.is_public !== undefined) payload.isPublic = params.is_public;

        const col = await updateCollection(params.id, payload);
        return {
          content: [{
            type: "text",
            text: `Collection updated (ID: ${col.id})\n\n${formatCollectionMarkdown(col)}`,
          }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // delete_collection
  server.registerTool(
    "linkwarden_delete_collection",
    {
      title: "Delete Linkwarden Collection",
      description: `Permanently delete a collection from Linkwarden. Links within the collection may be moved to the default collection or deleted — verify behavior in your Linkwarden settings before deleting.

Args:
  - id (number, required): Collection ID to delete

Returns a confirmation message on success.`,
      inputSchema: z.object({
        id: z.number().int().describe("Collection ID to delete"),
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
        await deleteCollection(params.id);
        return { content: [{ type: "text", text: `Collection ${params.id} deleted successfully.` }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
