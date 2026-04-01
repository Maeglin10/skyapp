import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryEntry, MemorySearchResult } from './memory.types';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(private prisma: PrismaService) {}

  async store(agentId: string, content: string, metadata: Record<string, unknown> = {}): Promise<MemoryEntry> {
    const embedding = await this.generateEmbedding(content);
    const embeddingStr = `[${embedding.join(',')}]`;
    const entries = await this.prisma.$queryRawUnsafe<MemoryEntry[]>(
      `INSERT INTO "MemoryEntry" (id, "agentId", content, embedding, metadata, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3::vector, $4::jsonb, NOW()) RETURNING id, "agentId", content, metadata, "createdAt"`,
      agentId, content, embeddingStr, JSON.stringify(metadata),
    );
    this.logger.debug(`Stored memory for agent ${agentId}`);
    return entries[0];
  }

  async search(agentId: string, query: string, topK = 5): Promise<MemorySearchResult[]> {
    const embedding = await this.generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;
    return this.prisma.$queryRawUnsafe<MemorySearchResult[]>(
      `SELECT id, "agentId", content, metadata, "createdAt", 1 - (embedding <=> $3::vector) as similarity FROM "MemoryEntry" WHERE "agentId" = $1 ORDER BY embedding <=> $3::vector LIMIT $2`,
      agentId, topK, embeddingStr,
    );
  }

  async getRecent(agentId: string, limit = 20): Promise<MemoryEntry[]> {
    return this.prisma.memoryEntry.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' }, take: limit }) as unknown as MemoryEntry[];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.embeddings.create({ model: 'text-embedding-3-small', input: text });
    return r.data[0].embedding;
  }
}
