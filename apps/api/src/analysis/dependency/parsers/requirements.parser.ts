export interface PythonRequirement {
  name: string;
  version?: string;
}

export function parseRequirementsTxt(content: string): PythonRequirement[] {
  const requirements: PythonRequirement[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?/);
    if (match) {
      requirements.push({ name: match[1].toLowerCase(), version: match[2]?.trim() });
    }
  }

  return requirements;
}
