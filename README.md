# linkwarden-mcp-server

An MCP (Model Context Protocol) server for [Linkwarden](https://linkwarden.app) — the self-hosted, open-source bookmark manager. Connect it to Claude to read, search, organize, and clean up your bookmarks via natural language.

## Features

- **Browse & search** — list links with filtering by collection, tag, date range, and full-text search
- **Research** — find bookmarks to summarize, build newsletters, or gather context
- **Recategorize** — move links between collections, add/remove tags, rename, update descriptions
- **Cleanup** — delete stale links, merge duplicate tags, restructure collections
- **Full CRUD** — create, read, update, and delete links, collections, and tags

## Prerequisites

- A running [Linkwarden](https://linkwarden.app) instance (self-hosted or cloud)
- A Linkwarden API token — generate one at **Settings → Access Tokens**
- Node.js 18+

## Quickstart (Claude Code)

Add this to your `~/.claude.json` under `mcpServers`:

```json
"linkwarden": {
  "command": "npx",
  "args": ["-y", "linkwarden-mcp-server"],
  "env": {
    "LINKWARDEN_BASE_URL": "https://your-linkwarden-instance.com",
    "LINKWARDEN_API_TOKEN": "your-api-token"
  }
}
```

Or if you have it installed globally (`npm install -g linkwarden-mcp-server`):

```json
"linkwarden": {
  "command": "linkwarden-mcp-server",
  "env": {
    "LINKWARDEN_BASE_URL": "https://your-linkwarden-instance.com",
    "LINKWARDEN_API_TOKEN": "your-api-token"
  }
}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LINKWARDEN_BASE_URL` | Yes | Base URL of your Linkwarden instance, e.g. `https://linkwarden.example.com` |
| `LINKWARDEN_API_TOKEN` | Yes | API token from Settings → Access Tokens |

## Tools

### Links
| Tool | Description |
|---|---|
| `linkwarden_list_links` | List bookmarks with filtering by collection, tag, search, date, pinned status; supports pagination |
| `linkwarden_get_link` | Get full details of a single bookmark by ID |
| `linkwarden_create_link` | Save a new bookmark URL with optional name, description, collection, and tags |
| `linkwarden_update_link` | Update a bookmark's name, URL, description, collection, tags, or pinned status |
| `linkwarden_delete_link` | Permanently delete a bookmark |

### Collections
| Tool | Description |
|---|---|
| `linkwarden_list_collections` | List all collections, displayed as a hierarchy |
| `linkwarden_create_collection` | Create a new collection, optionally nested under a parent |
| `linkwarden_update_collection` | Rename, recolor, re-nest, or change the visibility of a collection |
| `linkwarden_delete_collection` | Delete a collection |

### Tags
| Tool | Description |
|---|---|
| `linkwarden_list_tags` | List all tags with their numeric IDs (needed for filtering) |
| `linkwarden_rename_tag` | Rename a tag across all links that use it |
| `linkwarden_delete_tag` | Delete a tag from all links (links are not deleted) |

## Search Operators

`linkwarden_list_links` accepts a `search` parameter that supports advanced operators:

| Operator | Example | Description |
|---|---|---|
| `name:` | `name:"product review"` | Search in link title |
| `url:` | `url:github.com` | Search in URL |
| `tag:` | `tag:ai` | Filter by tag name |
| `collection:` | `collection:research` | Filter by collection name |
| `description:` | `description:security` | Search in description |
| `before:` | `before:2025-01-01` | Links saved before date |
| `after:` | `after:2024-06-01` | Links saved after date |
| `type:` | `type:pdf` | Filter by type (url, pdf, image) |
| `pinned:true` | `pinned:true` | Show only pinned links |
| `!` | `!tag:news` | Negate any operator |

> Advanced search requires Meilisearch to be configured on your Linkwarden instance.

## Development

```bash
git clone https://github.com/ozskywalker/linkwarden-mcp-server.git
cd linkwarden-mcp-server
npm install
npm run build
```

To run in watch mode during development:

```bash
LINKWARDEN_BASE_URL=https://your-instance.com \
LINKWARDEN_API_TOKEN=your-token \
npm run dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
