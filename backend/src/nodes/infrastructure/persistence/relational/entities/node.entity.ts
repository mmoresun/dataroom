import { DataRoomEntity } from '../../../../../data-rooms/infrastructure/persistence/relational/entities/data-room.entity';

import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'node',
})
export class NodeEntity extends EntityRelationalHelper {
  @Column({
    nullable: true,
    type: String,
  })
  s3Key?: string | null;

  @Column({
    nullable: true,
    type: String,
  })
  mimeType?: string | null;

  @Column({
    nullable: true,
    type: Number,
  })
  size?: number | null;

  @ManyToOne(() => DataRoomEntity, { eager: false, nullable: false })
  dataRoom?: DataRoomEntity;

  @Column({
    nullable: false,
    type: String,
  })
  parentId: string;

  @Column({
    nullable: false,
    type: String,
  })
  name: string;

  @Column({
    nullable: false,
    type: String,
  })
  type: string;

  // False from `requestUpload` until `confirmUpload` verifies the S3 object actually
  // landed — filtered out of listings so a failed/abandoned client-side upload doesn't
  // show a "ghost" file that doesn't really exist in storage.
  @Column({
    nullable: false,
    type: Boolean,
    default: true,
  })
  confirmed: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
