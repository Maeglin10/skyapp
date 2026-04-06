import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './services/logger/logger.module';
import { TraceModule } from './services/trace/trace.module';
import { AiGovernanceModule } from './services/ai-governance/ai-governance.module';
import { AuthModule } from './services/auth/auth.module';
import { CacheModule } from './services/cache/cache.module';
import { AgentsApiModule } from './api/agents/agents.module';
import { TasksApiModule } from './api/tasks/tasks.module';
import { MemoryApiModule } from './api/memory/memory.module';
import { ToolsApiModule } from './api/tools/tools.module';
import { AdminModule } from './api/admin/admin.module';
import { HealthModule } from './api/health/health.module';
import { PluginsModule } from './core/plugins/plugins.module';
import { ModelLabModule } from './core/model-lab/model-lab.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    LoggerModule,
    TraceModule,
    AiGovernanceModule,
    AuthModule,
    CacheModule,
    AgentsApiModule,
    TasksApiModule,
    MemoryApiModule,
    ToolsApiModule,
    AdminModule,
    HealthModule,
    PluginsModule,
    ModelLabModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
