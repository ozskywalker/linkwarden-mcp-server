import axios, { AxiosError, AxiosInstance } from "axios";
import type {
  CreateCollectionPayload,
  CreateLinkPayload,
  LinkwardenCollection,
  LinkwardenLink,
  LinkwardenTag,
  LinksQueryParams,
  PaginatedLinks,
  UpdateCollectionPayload,
  UpdateLinkPayload,
  UpdateTagPayload,
} from "../types.js";

let client: AxiosInstance | null = null;

export function getClient(): AxiosInstance {
  if (client) return client;

  const baseURL = process.env.LINKWARDEN_BASE_URL;
  const token = process.env.LINKWARDEN_API_TOKEN;

  if (!baseURL) {
    throw new Error(
      "LINKWARDEN_BASE_URL environment variable is required (e.g. https://your-linkwarden.example.com)"
    );
  }
  if (!token) {
    throw new Error(
      "LINKWARDEN_API_TOKEN environment variable is required. Generate one at Settings > Access Tokens."
    );
  }

  client = axios.create({
    baseURL: `${baseURL.replace(/\/$/, "")}/api/v1`,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return client;
}

export function handleApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response) {
      const status = error.response.status;
      const detail =
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "error" in error.response.data
          ? ` — ${String(error.response.data.error)}`
          : "";
      switch (status) {
        case 400:
          return `Error: Bad request${detail}. Check your input parameters.`;
        case 401:
          return "Error: Unauthorized. Check that LINKWARDEN_API_TOKEN is valid.";
        case 403:
          return "Error: Forbidden. You don't have permission to perform this action.";
        case 404:
          return `Error: Resource not found. Check the ID is correct.`;
        case 429:
          return "Error: Rate limit exceeded. Please wait before making more requests.";
        default:
          return `Error: API request failed with status ${status}${detail}.`;
      }
    } else if (error.code === "ECONNABORTED") {
      return "Error: Request timed out. Check that LINKWARDEN_BASE_URL is reachable.";
    } else if (error.code === "ECONNREFUSED") {
      return "Error: Connection refused. Check that LINKWARDEN_BASE_URL is correct and the server is running.";
    }
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

// --- Links ---

export async function listLinks(params: LinksQueryParams): Promise<LinkwardenLink[]> {
  const c = getClient();
  const queryParams: Record<string, unknown> = {};
  if (params.cursor !== undefined) queryParams.cursor = params.cursor;
  if (params.sort !== undefined) queryParams.sort = params.sort;
  if (params.collectionId !== undefined) queryParams.collectionId = params.collectionId;
  if (params.tagId !== undefined) queryParams.tagId = params.tagId;
  if (params.pinnedOnly) queryParams.pinnedOnly = true;
  if (params.searchQueryString) queryParams.searchQueryString = params.searchQueryString;
  if (params.searchByName !== undefined) queryParams.searchByName = params.searchByName;
  if (params.searchByUrl !== undefined) queryParams.searchByUrl = params.searchByUrl;
  if (params.searchByDescription !== undefined) queryParams.searchByDescription = params.searchByDescription;
  if (params.searchByTextContent !== undefined) queryParams.searchByTextContent = params.searchByTextContent;
  if (params.searchByTags !== undefined) queryParams.searchByTags = params.searchByTags;

  const res = await c.get<PaginatedLinks>("/links", { params: queryParams });
  return res.data.response;
}

export async function getLink(id: number): Promise<LinkwardenLink> {
  const c = getClient();
  const res = await c.get<{ response: LinkwardenLink }>(`/links/${id}`);
  return res.data.response;
}

export async function createLink(payload: CreateLinkPayload): Promise<LinkwardenLink> {
  const c = getClient();
  const res = await c.post<{ response: LinkwardenLink }>("/links", payload);
  return res.data.response;
}

export async function updateLink(id: number, payload: UpdateLinkPayload): Promise<LinkwardenLink> {
  const c = getClient();
  const res = await c.put<{ response: LinkwardenLink }>(`/links/${id}`, payload);
  return res.data.response;
}

export async function deleteLink(id: number): Promise<void> {
  const c = getClient();
  await c.delete(`/links/${id}`);
}

// --- Collections ---

export async function listCollections(): Promise<LinkwardenCollection[]> {
  const c = getClient();
  const res = await c.get<{ response: LinkwardenCollection[] }>("/collections");
  return res.data.response;
}

export async function getCollection(id: number): Promise<LinkwardenCollection> {
  const c = getClient();
  const res = await c.get<{ response: LinkwardenCollection }>(`/collections/${id}`);
  return res.data.response;
}

export async function createCollection(payload: CreateCollectionPayload): Promise<LinkwardenCollection> {
  const c = getClient();
  const res = await c.post<{ response: LinkwardenCollection }>("/collections", payload);
  return res.data.response;
}

export async function updateCollection(id: number, payload: UpdateCollectionPayload): Promise<LinkwardenCollection> {
  const c = getClient();
  const res = await c.put<{ response: LinkwardenCollection }>(`/collections/${id}`, payload);
  return res.data.response;
}

export async function deleteCollection(id: number): Promise<void> {
  const c = getClient();
  await c.delete(`/collections/${id}`);
}

// --- Tags ---

export async function listTags(): Promise<LinkwardenTag[]> {
  const c = getClient();
  const res = await c.get<{ response: LinkwardenTag[] }>("/tags");
  return res.data.response;
}

export async function updateTag(id: number, payload: UpdateTagPayload): Promise<LinkwardenTag> {
  const c = getClient();
  const res = await c.put<{ response: LinkwardenTag }>(`/tags/${id}`, payload);
  return res.data.response;
}

export async function deleteTag(id: number): Promise<void> {
  const c = getClient();
  await c.delete(`/tags/${id}`);
}
