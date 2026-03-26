import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  deleteTag,
  handleApiError,
  listTags,
  updateTag,
} from "../services/client.js";
import type { LinkwardenTag } from "../types.js";
import { ResponseFormat } from "../types.js";

function formatTagMarkdown(tag: LinkwardenTag): string {
  return `- **${tag.name}** (ID: ${tag.id}) — created ${new Date(tag.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`;
}

export function registerTagTools(server: McpServer): void {
  // list_tags
  server.registerTool(
    "linkwarden_list_tags",
    {
      title: "List Linkwarden Tags",
      description: `Retrieve all tags in the user's Linkwarden account.

Use this tool to discover available tags and their numeric IDs before filtering links with linkwarden_list_links (which requires tag_id, not tag name).

Args:
  - response_format ('markdown'|'json'): Output format (default: 'markdown')

Returns (JSON format):
  [{
    "id": number,
    "name": string,
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
        const tags = await listTags();
        if (params.response_format === ResponseFormat.JSON) {
          return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
        }
        if (tags.length === 0) {
          return { content: [{ type: "text", text: "No tags found." }] };
        }
        const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
        const lines = [`# Tags (${tags.length})`, "", ...sorted.map(formatTagMarkdown)];
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // update_tag (rename)
  server.registerTool(
    "linkwarden_rename_tag",
    {
      title: "Rename Linkwarden Tag",
      description: `Rename an existing tag in Linkwarden. All links using this tag will reflect the new name.

Use linkwarden_list_tags first to find the tag's numeric ID.

Args:
  - id (number, required): Tag ID to rename
  - name (string, required): New tag name

Returns the updated tag.`,
      inputSchema: z.object({
        id: z.number().int().describe("Tag ID to rename"),
        name: z.string().min(1).describe("New tag name"),
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
        const tag = await updateTag(params.id, { name: params.name });
        return {
          content: [{
            type: "text",
            text: `Tag renamed successfully.\n${formatTagMarkdown(tag)}`,
          }],
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  // delete_tag
  server.registerTool(
    "linkwarden_delete_tag",
    {
      title: "Delete Linkwarden Tag",
      description: `Permanently delete a tag from Linkwarden. The tag will be removed from all links that use it, but the links themselves will not be deleted.

Use linkwarden_list_tags first to find the tag's numeric ID.

Args:
  - id (number, required): Tag ID to delete

Returns a confirmation message on success.`,
      inputSchema: z.object({
        id: z.number().int().describe("Tag ID to delete"),
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
        await deleteTag(params.id);
        return { content: [{ type: "text", text: `Tag ${params.id} deleted successfully.` }] };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
