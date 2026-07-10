import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max } from 'class-validator';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export class RequestUploadDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsInt()
  @Max(MAX_FILE_SIZE_BYTES)
  fileSize: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  parentId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  dataRoomId: string;
}
