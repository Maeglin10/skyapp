import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './services/logger/logger.module';
import { TraceModule } from './services/trace/trace.module';
import { AiGovernanceModule } from './services/ai-governance/ai-governance.module';
import { AgentsApiModule } from './api/agents/agents.module';
import { TasksApiModule } from './api/tasks/tasks.module';
import { MemoryApiModule } from './api/memory/memory.module';
import { ToolsApiModule } from './api/tools/tools.module';
import { AdminModule } from './api/admin/admin.module';
import { HealthModule } from './api/health/health.module';
import { AuthModule } from './auth/auth.module';
import { AppThrottlerModule } from './common/throttler/throttler.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    LoggerModule,
    TraceModule,
    AiGovernanceModule,
    AgentsApiModule,
    TasksApiModule,
    MemoryApiModule,
    ToolsApiModule,
    AdminModule,
    HealthModule,
    AppThrottlerModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
