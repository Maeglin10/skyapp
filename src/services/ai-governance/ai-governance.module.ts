import { Global, Module } from '@nestjs/common';
import { AiGovernanceService } from './ai-governance.service';

@Global()
@Module({ providers: [AiGovernanceService], exports: [AiGovernanceService] })
export class AiGovernanceModule {}
