export interface MemoryEntry {
  id: string;
  agentId: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface MemorySearchResult extends MemoryEntry {
  similarity: number;
}
