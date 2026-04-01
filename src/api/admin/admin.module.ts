import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AiGovernanceModule } from '../../services/ai-governance/ai-governance.module';

@Module({ imports: [AiGovernanceModule], controllers: [AdminController] })
export class AdminModule {}
