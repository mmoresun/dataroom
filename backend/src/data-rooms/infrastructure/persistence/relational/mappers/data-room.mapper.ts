import { DataRoom } from '../../../../domain/data-room';
import { UserMapper } from '../../../../../users/infrastructure/persistence/relational/mappers/user.mapper';

import { DataRoomEntity } from '../entities/data-room.entity';

export class DataRoomMapper {
  static toDomain(raw: DataRoomEntity): DataRoom {
    const domainEntity = new DataRoom();
    if (raw.owner) {
      domainEntity.owner = UserMapper.toDomain(raw.owner);
    }

    domainEntity.name = raw.name;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: DataRoom): DataRoomEntity {
    const persistenceEntity = new DataRoomEntity();
    if (domainEntity.owner) {
      persistenceEntity.owner = UserMapper.toPersistence(domainEntity.owner);
    }

    persistenceEntity.name = domainEntity.name;

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
