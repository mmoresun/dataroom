import { RelationalDataRoomPersistenceModule } from '../data-rooms/infrastructure/persistence/relational/relational-persistence.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { NodesService } from './nodes.service';
import { NodesController } from './nodes.controller';
import { NodeStorageService } from './node-storage.service';
import { RelationalNodePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // Depends only on the DataRoom persistence module (for the DataRoomRepository
    // port), not DataRoomsModule itself — DataRoomsModule depends on NodesModule
    // for cascade-delete, so depending back on it here would be circular.
    RelationalDataRoomPersistenceModule,

    // do not remove this comment
    RelationalNodePersistenceModule,
  ],
  controllers: [NodesController],
  providers: [NodesService, NodeStorageService],
  exports: [NodesService, NodeStorageService, RelationalNodePersistenceModule],
})
export class NodesModule {}
