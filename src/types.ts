// Linkwarden API data models

export interface LinkwardenLink {
  id: number;
  name: string;
  type: string;
  description: string;
  url: string;
  preview?: string;
  image?: string;
  pdf?: string;
  readable?: string;
  monolith?: string;
  collectionId: number;
  collection?: LinkwardenCollection;
  tags?: LinkwardenTag[];
  createdById: number;
  pinnedBy?: { id: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface LinkwardenCollection {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  iconWeight?: string;
  parentId?: number;
  parent?: LinkwardenCollection;
  isPublic: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkwardenTag {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface LinkwardenUser {
  id: number;
  name: string;
  email: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export enum SortOrder {
  DateNewestFirst = 0,
  DateOldestFirst = 1,
  NameAZ = 2,
  NameZA = 3,
}

export interface LinksQueryParams {
  cursor?: number;
  sort?: SortOrder;
  collectionId?: number;
  tagId?: number;
  pinnedOnly?: boolean;
  searchQueryString?: string;
  searchByName?: boolean;
  searchByUrl?: boolean;
  searchByDescription?: boolean;
  searchByTextContent?: boolean;
  searchByTags?: boolean;
}

export interface PaginatedLinks {
  response: LinkwardenLink[];
}

export interface CreateLinkPayload {
  url: string;
  name?: string;
  description?: string;
  collectionId?: number;
  tags?: { name: string }[];
}

export interface UpdateLinkPayload {
  url?: string;
  name?: string;
  description?: string;
  collectionId?: number;
  tags?: { id?: number; name: string }[];
  pinnedBy?: { id: number }[];
}

export interface CreateCollectionPayload {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: number;
  isPublic?: boolean;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: number;
  isPublic?: boolean;
}

export interface UpdateTagPayload {
  name: string;
}

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}
