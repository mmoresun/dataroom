import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RenameDataRoomDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}
