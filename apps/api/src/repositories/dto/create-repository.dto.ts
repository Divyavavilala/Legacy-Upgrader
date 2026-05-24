import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsGitUrl } from '../../common/validators';

export class CreateRepositoryDto {
  @ApiProperty({ example: 'Legacy Frontend' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'legacy-frontend' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (e.g. my-repo-name)',
  })
  slug!: string;

  @ApiProperty({ example: 'https://github.com/acme/legacy-frontend.git' })
  @IsGitUrl()
  gitUrl!: string;

  @ApiPropertyOptional({ example: 'main' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultBranch?: string;
}
