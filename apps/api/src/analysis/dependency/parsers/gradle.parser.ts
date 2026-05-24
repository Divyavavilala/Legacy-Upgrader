export interface GradleAnalysis {
  javaVersion?: string;
  springBootVersion?: string;
}

export function parseGradleBuild(content: string): GradleAnalysis {
  const javaVersion =
    content.match(/sourceCompatibility\s*=\s*['"]?([^'"\n]+)['"]?/i)?.[1] ??
    content.match(/JavaVersion\.VERSION_(\d+)/i)?.[1];

  const springBootVersion = content.match(
    /id\s+['"]org\.springframework\.boot['"]\s+version\s+['"]([^'"]+)['"]/i,
  )?.[1];

  return {
    javaVersion: javaVersion?.trim(),
    springBootVersion: springBootVersion?.trim(),
  };
}
