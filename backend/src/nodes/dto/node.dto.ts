import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class NodeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
