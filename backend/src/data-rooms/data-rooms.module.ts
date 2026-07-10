import { UsersModule } from '../users/users.module';
import { NodesModule } from '../nodes/nodes.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { DataRoomsController } from './data-rooms.controller';
import { RelationalDataRoomPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,
    // For cascade-deleting a room's nodes/S3 objects — see NodesModule for why
    // this is one-directional (it depends on the DataRoom persistence module,
    // not on this module).
    NodesModule,

    // do not remove this comment
    RelationalDataRoomPersistenceModule,
  ],
  controllers: [DataRoomsController],
  providers: [DataRoomsService],
  exports: [DataRoomsService, RelationalDataRoomPersistenceModule],
})
export class DataRoomsModule {}
