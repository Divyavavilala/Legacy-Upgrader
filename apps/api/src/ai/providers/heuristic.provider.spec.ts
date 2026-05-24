import { HeuristicAiProvider } from './heuristic.provider';

describe('HeuristicAiProvider', () => {
  const provider = new HeuristicAiProvider();

  it('returns structured JSON for security prompts', async () => {
    const response = await provider.complete({
      systemPrompt: 'test',
      userPrompt: 'Perform security review with vulnerable dependency context',
      jsonMode: true,
    });

    const parsed = JSON.parse(response.content) as { title: string; confidence: number };
    expect(parsed.title).toContain('Security');
    expect(parsed.confidence).toBeGreaterThan(0);
    expect(response.provider).toBe('heuristic');
  });
});
