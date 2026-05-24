import { parseMavenPom } from './maven.parser';

describe('maven.parser', () => {
  it('parses Java and Spring Boot versions from pom.xml', () => {
    const pom = `<?xml version="1.0"?>
<project>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.7.18</version>
  </parent>
  <properties>
    <java.version>11</java.version>
  </properties>
  <dependencies>
    <dependency>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`;

    const result = parseMavenPom(pom);

    expect(result.javaVersion).toBe('11');
    expect(result.springBootVersion).toBe('2.7.18');
    expect(result.dependencies.length).toBeGreaterThan(0);
  });
});
