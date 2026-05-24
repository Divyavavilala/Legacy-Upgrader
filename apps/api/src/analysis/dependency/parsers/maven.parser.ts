export interface MavenAnalysis {
  javaVersion?: string;
  springBootVersion?: string;
  dependencies: Array<{ artifactId: string; version?: string }>;
}

export function parseMavenPom(content: string): MavenAnalysis {
  const dependencies: MavenAnalysis['dependencies'] = [];
  const depRegex =
    /<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?(?:<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/gi;

  let match: RegExpExecArray | null;
  while ((match = depRegex.exec(content)) !== null) {
    dependencies.push({
      artifactId: match[1].trim(),
      version: match[2]?.trim(),
    });
  }

  const javaVersion =
    content.match(/<java\.version>([^<]+)<\/java\.version>/i)?.[1] ??
    content.match(/<maven\.compiler\.release>([^<]+)<\/maven\.compiler\.release>/i)?.[1] ??
    content.match(/<maven\.compiler\.source>([^<]+)<\/maven\.compiler\.source>/i)?.[1];

  const springBootVersion =
    content.match(
      /<parent>[\s\S]*?<artifactId>spring-boot-starter-parent<\/artifactId>[\s\S]*?<version>([^<]+)<\/version>/i,
    )?.[1] ??
    content.match(/<spring-boot\.version>([^<]+)<\/spring-boot\.version>/i)?.[1];

  return {
    javaVersion: javaVersion?.trim(),
    springBootVersion: springBootVersion?.trim(),
    dependencies,
  };
}
