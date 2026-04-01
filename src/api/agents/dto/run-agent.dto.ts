import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RunAgentDto {
  @ApiProperty() @IsString() message!: string;
  @ApiPropertyOptional({ enum: ['COORDINATOR','WORKER','ANALYST','DEBUGGER'], default: 'WORKER' }) @IsEnum(['COORDINATOR','WORKER','ANALYST','DEBUGGER']) @IsOptional() @Transform(({ value }) => value || 'WORKER') role?: string;
  @ApiPropertyOptional({ enum: ['anthropic','openai','gemini'], default: 'anthropic' }) @IsEnum(['anthropic','openai','gemini']) @IsOptional() @Transform(({ value }) => value || 'anthropic') provider?: string;
  @ApiPropertyOptional({ default: 10 }) @IsNumber() @Min(1) @Max(20) @IsOptional() @Transform(({ value }) => value !== undefined ? value : 10) maxIterations?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() context?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() systemPrompt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsString({ each: true }) @IsOptional() permissions?: string[];
}
