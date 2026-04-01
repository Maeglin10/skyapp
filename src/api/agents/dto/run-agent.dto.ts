import { IsString, IsEnum, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RunAgentDto {
  @ApiProperty() @IsString() message: string;
  @ApiPropertyOptional({ enum: ['COORDINATOR','WORKER','ANALYST','DEBUGGER'], default: 'WORKER' }) @IsEnum(['COORDINATOR','WORKER','ANALYST','DEBUGGER']) @IsOptional() role?: string;
  @ApiPropertyOptional({ enum: ['anthropic','openai','gemini'], default: 'anthropic' }) @IsEnum(['anthropic','openai','gemini']) @IsOptional() provider?: string;
  @ApiPropertyOptional({ default: 10 }) @IsNumber() @Min(1) @Max(20) @IsOptional() maxIterations?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() context?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() systemPrompt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsString({ each: true }) @IsOptional() permissions?: string[];
}
