import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { MemoryService } from '../../core/memory/memory.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';

class QueryMemoryDto {
  @ApiProperty() @IsString() query!: string;
  @ApiProperty() @IsString() agentId!: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() topK?: number;
}

class StoreMemoryDto {
  @ApiProperty() @IsString() agentId!: string;
  @ApiProperty() @IsString() content!: string;
}

@ApiTags('Memory')
@Controller('memory')
export class MemoryController {
  constructor(private memoryService: MemoryService) {}
  @Post('store') @ApiOperation({ summary: 'Store memory with vector embedding' }) store(@Body() dto: StoreMemoryDto) { return this.memoryService.store(dto.agentId, dto.content); }
  @Post('query') @ApiOperation({ summary: 'Semantic search across memories' }) query(@Body() dto: QueryMemoryDto) { return this.memoryService.search(dto.agentId, dto.query, dto.topK ?? 5); }
  @Get(':agentId/recent') @ApiOperation({ summary: 'Recent memories for an agent' }) recent(@Param('agentId') agentId: string, @Query('limit') limit?: string) { return this.memoryService.getRecent(agentId, limit ? parseInt(limit) : 20); }
  @Post('ingest') @ApiOperation({ summary: 'Ingest document with chunking and embedding' }) async ingest(@Body() dto: IngestDocumentDto) { const result = await this.memoryService.ingest(dto.agentId, dto.content, dto.metadata, dto.chunkSize); return { agentId: dto.agentId, ...result, message: `Successfully ingested document with ${result.stored}/${result.chunks} chunks stored` }; }
}
