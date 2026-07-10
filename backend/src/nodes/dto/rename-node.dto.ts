import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenameNodeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}
