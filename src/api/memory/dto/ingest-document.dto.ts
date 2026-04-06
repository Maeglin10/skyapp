import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class IngestDocumentDto {
  @ApiProperty({ description: 'Agent ID to associate the document with' })
  @IsString()
  agentId!: string;

  @ApiProperty({ description: 'Document content (plain text or markdown)' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Optional metadata (filename, source, etc.)', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Max chars per chunk (default 1000)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4000)
  chunkSize?: number;
}
