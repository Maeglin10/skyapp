import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryModule } from '../../core/memory/memory.module';

@Module({ imports: [MemoryModule], controllers: [MemoryController] })
export class MemoryApiModule {}
