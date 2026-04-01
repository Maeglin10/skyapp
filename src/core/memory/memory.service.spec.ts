import { Test } from '@nestjs/testing';
import { MemoryService } from './memory.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MemoryService', () => {
  let service: MemoryService;
  const mockPrisma = { $queryRawUnsafe: jest.fn(), memoryEntry: { findMany: jest.fn() } };

  beforeEach(async () => {
    const m = await Test.createTestingModule({ providers: [MemoryService, { provide: PrismaService, useValue: mockPrisma }] }).compile();
    service = m.get(MemoryService);
  });

  it('is defined', () => expect(service).toBeDefined());

  it('calls findMany for getRecent', async () => {
    mockPrisma.memoryEntry.findMany.mockResolvedValue([]);
    await service.getRecent('a1', 10);
    expect(mockPrisma.memoryEntry.findMany).toHaveBeenCalledWith({ where: { agentId: 'a1' }, orderBy: { createdAt: 'desc' }, take: 10 });
  });
});
