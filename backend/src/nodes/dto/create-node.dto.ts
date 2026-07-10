import { DataRoomDto } from '../../data-rooms/dto/data-room.dto';

import {
  // decorators here

  IsString,
  IsNumber,
  IsOptional,
  IsIn,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateNodeDto {
  s3Key?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  size?: number | null;

  dataRoom?: DataRoomDto;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  parentId: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    enum: ['folder', 'file'],
  })
  @IsIn(['folder', 'file'])
  type: 'folder' | 'file';

  // Don't forget to use the class-validator decorators in the DTO properties.
}
