import { Module } from '@nestjs/common';
import { DataRoomRepository } from '../data-room.repository';
import { DataRoomRelationalRepository } from './repositories/data-room.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataRoomEntity } from './entities/data-room.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DataRoomEntity])],
  providers: [
    {
      provide: DataRoomRepository,
      useClass: DataRoomRelationalRepository,
    },
  ],
  exports: [DataRoomRepository],
})
export class RelationalDataRoomPersistenceModule {}
