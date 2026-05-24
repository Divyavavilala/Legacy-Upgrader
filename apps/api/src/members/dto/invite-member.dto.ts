import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotIn } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  @IsNotIn([UserRole.OWNER], { message: 'Cannot invite as OWNER' })
  role!: UserRole;
}
