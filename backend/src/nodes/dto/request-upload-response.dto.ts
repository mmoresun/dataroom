import { ApiProperty } from '@nestjs/swagger';

export class RequestUploadResponseDto {
  @ApiProperty()
  fileId: string;

  @ApiProperty()
  uploadUrl: string;
}
