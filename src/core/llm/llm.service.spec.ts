import { Test } from '@nestjs/testing';
import { LLMService } from './llm.service';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(async () => {
    const mockAdapter = { chat: jest.fn(), stream: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        LLMService,
        { provide: ClaudeAdapter, useValue: { ...mockAdapter, provider: 'anthropic' } },
        { provide: OpenAIAdapter, useValue: { ...mockAdapter, provider: 'openai' } },
        { provide: GeminiAdapter, useValue: { ...mockAdapter, provider: 'gemini' } },
      ],
    }).compile();
    service = module.get(LLMService);
  });

  it('should return correct adapter for each provider', () => {
    expect(service.getAdapter('anthropic').provider).toBe('anthropic');
    expect(service.getAdapter('openai').provider).toBe('openai');
    expect(service.getAdapter('gemini').provider).toBe('gemini');
  });

  it('should throw for unknown provider', () => {
    expect(() => service.getAdapter('unknown' as any)).toThrow('Unknown LLM provider');
  });
});
