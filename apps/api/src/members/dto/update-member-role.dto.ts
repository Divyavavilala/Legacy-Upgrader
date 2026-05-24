import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEnum, IsNotIn } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotIn([UserRole.OWNER], { message: 'Cannot assign OWNER via role update' })
  role!: UserRole;
}
