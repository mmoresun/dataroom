import { DataRoom } from '../../data-rooms/domain/data-room';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class Node {
  @Exclude({ toPlainOnly: true })
  s3Key?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  mimeType?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  size?: number | null;

  @Exclude({ toPlainOnly: true })
  dataRoom?: DataRoom;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  parentId: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  type: string;

  @Exclude({ toPlainOnly: true })
  confirmed?: boolean;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
