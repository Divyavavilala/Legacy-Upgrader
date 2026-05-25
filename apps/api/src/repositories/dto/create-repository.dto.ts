import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsGitUrl } from '../../common/validators';

export class CreateRepositoryDto {
  @ApiProperty({ example: 'https://github.com/facebook/react' })
  @IsGitUrl()
  gitUrl!: string;

  @ApiPropertyOptional({ example: 'React' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;
}
