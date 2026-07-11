import { Node } from '../../../../domain/node';

import { DataRoomMapper } from '../../../../../data-rooms/infrastructure/persistence/relational/mappers/data-room.mapper';

import { NodeEntity } from '../entities/node.entity';

export class NodeMapper {
  static toDomain(raw: NodeEntity): Node {
    const domainEntity = new Node();
    domainEntity.s3Key = raw.s3Key;

    domainEntity.mimeType = raw.mimeType;

    domainEntity.size = raw.size;

    if (raw.dataRoom) {
      domainEntity.dataRoom = DataRoomMapper.toDomain(raw.dataRoom);
    }

    domainEntity.parentId = raw.parentId;

    domainEntity.name = raw.name;

    domainEntity.type = raw.type;

    domainEntity.confirmed = raw.confirmed;

    domainEntity.id = raw.id;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;

    return domainEntity;
  }

  static toPersistence(domainEntity: Node): NodeEntity {
    const persistenceEntity = new NodeEntity();
    persistenceEntity.s3Key = domainEntity.s3Key;

    persistenceEntity.mimeType = domainEntity.mimeType;

    persistenceEntity.size = domainEntity.size;

    if (domainEntity.dataRoom) {
      persistenceEntity.dataRoom = DataRoomMapper.toPersistence(
        domainEntity.dataRoom,
      );
    }

    persistenceEntity.parentId = domainEntity.parentId;

    persistenceEntity.name = domainEntity.name;

    persistenceEntity.type = domainEntity.type;

    if (domainEntity.confirmed !== undefined) {
      persistenceEntity.confirmed = domainEntity.confirmed;
    }

    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;

    return persistenceEntity;
  }
}
