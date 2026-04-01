import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty() @IsString() description!: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() dependencies?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() agentId?: string;
}
