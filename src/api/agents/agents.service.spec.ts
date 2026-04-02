import { Test, TestingModule } from '@nestjs/testing';
import { AgentsService } from './agents.service';
import { AgentRunnerService } from '../../core/agent/agent-runner.service';
import { OrchestratorService } from '../../core/orchestrator/orchestrator.service';
import { RunAgentDto } from './dto/run-agent.dto';

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRunner: AgentRunnerService;
  let orchestrator: OrchestratorService;

  const mockAgentRunnerService = {
    run: jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      output: 'Task completed successfully',
      steps: [],
      usageLog: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 },
    }),
  };

  const mockOrchestratorService = {
    run: jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      objective: 'Test objective',
      coordinatorResponse: 'Orchestration complete',
      workerResponses: [],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: AgentRunnerService, useValue: mockAgentRunnerService },
        { provide: OrchestratorService, useValue: mockOrchestratorService },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
    agentRunner = module.get<AgentRunnerService>(AgentRunnerService);
    orchestrator = module.get<OrchestratorService>(OrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run', () => {
    it('should run an agent with default anthropic provider', async () => {
      const dto: RunAgentDto = {
        message: 'Test message',
        role: 'WORKER',
        maxIterations: 10,
      };

      const result = await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            name: expect.stringContaining('WORKER-agent'),
            role: 'WORKER',
            model: 'claude-haiku-4-5-20251001',
            provider: 'anthropic',
            maxIterations: 10,
          }),
          userMessage: 'Test message',
        }),
      );

      expect(result).toEqual({
        status: 'COMPLETED',
        output: 'Task completed successfully',
        steps: [],
        usageLog: { inputTokens: 100, outputTokens: 50, costUsd: 0.01 },
      });
    });

    it('should run an agent with openai provider', async () => {
      const dto: RunAgentDto = {
        message: 'Test OpenAI',
        provider: 'openai',
        role: 'ANALYST',
        maxIterations: 5,
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            role: 'ANALYST',
            model: 'gpt-4o-mini',
            provider: 'openai',
            maxIterations: 5,
          }),
          userMessage: 'Test OpenAI',
        }),
      );
    });

    it('should run an agent with gemini provider', async () => {
      const dto: RunAgentDto = {
        message: 'Test Gemini',
        provider: 'gemini',
        role: 'COORDINATOR',
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            role: 'COORDINATOR',
            model: 'gemini-2.0-flash',
            provider: 'gemini',
          }),
          userMessage: 'Test Gemini',
        }),
      );
    });

    it('should pass context and system prompt to agent runner', async () => {
      const dto: RunAgentDto = {
        message: 'Test with context',
        role: 'DEBUGGER',
        systemPrompt: 'You are a debugging expert',
        context: '{"key":"value"}',
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            systemPrompt: 'You are a debugging expert',
            role: 'DEBUGGER',
          }),
          userMessage: 'Test with context',
          context: '{"key":"value"}',
        }),
      );
    });

    it('should use default WORKER role if not specified', async () => {
      const dto: RunAgentDto = {
        message: 'Test without role',
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            role: 'WORKER',
            name: expect.stringContaining('WORKER-agent'),
          }),
        }),
      );
    });

    it('should use default maxIterations of 10 if not specified', async () => {
      const dto: RunAgentDto = {
        message: 'Test max iterations',
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            maxIterations: 10,
          }),
        }),
      );
    });

    it('should pass permissions to agent runner', async () => {
      const dto: RunAgentDto = {
        message: 'Test with permissions',
        permissions: ['read_files', 'write_files'],
      };

      await service.run(dto);

      expect(agentRunner.run).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            permissions: ['read_files', 'write_files'],
          }),
        }),
      );
    });

    it('should generate unique agent ID', async () => {
      const dto: RunAgentDto = {
        message: 'Test unique ID',
      };

      await service.run(dto);

      const firstCall = (agentRunner.run as jest.Mock).mock.calls[0][0];
      expect(firstCall.config.id).toBeDefined();
      expect(typeof firstCall.config.id).toBe('string');
      expect(firstCall.config.id.length).toBeGreaterThan(0);
    });
  });

  describe('orchestrate', () => {
    it('should orchestrate agents with default anthropic provider', async () => {
      const dto: RunAgentDto = {
        message: 'Orchestrate this task',
      };

      const result = await service.orchestrate(dto);

      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: 'Orchestrate this task',
          coordinatorProvider: 'anthropic',
        }),
      );

      expect(result).toEqual({
        status: 'COMPLETED',
        objective: 'Test objective',
        coordinatorResponse: 'Orchestration complete',
        workerResponses: [],
      });
    });

    it('should orchestrate with openai provider', async () => {
      const dto: RunAgentDto = {
        message: 'Orchestrate with OpenAI',
        provider: 'openai',
      };

      await service.orchestrate(dto);

      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: 'Orchestrate with OpenAI',
          coordinatorProvider: 'openai',
        }),
      );
    });

    it('should orchestrate with gemini provider', async () => {
      const dto: RunAgentDto = {
        message: 'Orchestrate with Gemini',
        provider: 'gemini',
      };

      await service.orchestrate(dto);

      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: 'Orchestrate with Gemini',
          coordinatorProvider: 'gemini',
        }),
      );
    });

    it('should pass context to orchestrator', async () => {
      const dto: RunAgentDto = {
        message: 'Orchestrate with context',
        context: '{"project":"skyapp","version":"1.0"}',
      };

      await service.orchestrate(dto);

      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({
          objective: 'Orchestrate with context',
          context: '{"project":"skyapp","version":"1.0"}',
        }),
      );
    });

    it('should use default anthropic provider if not specified', async () => {
      const dto: RunAgentDto = {
        message: 'Default orchestration',
      };

      await service.orchestrate(dto);

      expect(orchestrator.run).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinatorProvider: 'anthropic',
        }),
      );
    });

    it('should handle orchestration failures gracefully', async () => {
      mockOrchestratorService.run.mockRejectedValueOnce(
        new Error('Orchestration failed'),
      );

      const dto: RunAgentDto = {
        message: 'Failed orchestration',
      };

      await expect(service.orchestrate(dto)).rejects.toThrow(
        'Orchestration failed',
      );
    });
  });

  describe('integration', () => {
    it('should handle concurrent run and orchestrate calls', async () => {
      const runDto: RunAgentDto = {
        message: 'Run test',
        role: 'WORKER',
      };

      const orchestrateDto: RunAgentDto = {
        message: 'Orchestrate test',
      };

      const [runResult, orchestrateResult] = await Promise.all([
        service.run(runDto),
        service.orchestrate(orchestrateDto),
      ]);

      expect(runResult).toBeDefined();
      expect(orchestrateResult).toBeDefined();
      expect(agentRunner.run).toHaveBeenCalledTimes(1);
      expect(orchestrator.run).toHaveBeenCalledTimes(1);
    });
  });
});
