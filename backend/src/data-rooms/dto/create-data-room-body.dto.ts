import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Thin client-facing body — distinct from the generator's CreateDataRoomDto, whose
 * `owner` field is server-set from the JWT, never client-supplied. */
export class CreateDataRoomBodyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}
