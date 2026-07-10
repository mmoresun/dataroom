import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';
import { DataRoomRepository } from './infrastructure/persistence/data-room.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DataRoom } from './domain/data-room';
import { NodesService } from '../nodes/nodes.service';
import { NodeStorageService } from '../nodes/node-storage.service';
import {
  resolveUniqueName,
  assertNoNameCollision,
} from '../utils/unique-name.util';

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly userService: UsersService,

    // Dependencies here
    private readonly dataRoomRepository: DataRoomRepository,
    private readonly nodesService: NodesService,
    private readonly nodeStorageService: NodeStorageService,
  ) {}

  async create(createDataRoomDto: CreateDataRoomDto) {
    // Do not remove comment below.
    // <creating-property />
    let owner: User | undefined = undefined;

    if (createDataRoomDto.owner) {
      const ownerObject = await this.userService.findById(
        createDataRoomDto.owner.id,
      );
      if (!ownerObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            owner: 'notExists',
          },
        });
      }
      owner = ownerObject;
    }

    return this.dataRoomRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      owner,

      name: createDataRoomDto.name,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.dataRoomRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: DataRoom['id']) {
    return this.dataRoomRepository.findById(id);
  }

  findByIds(ids: DataRoom['id'][]) {
    return this.dataRoomRepository.findByIds(ids);
  }

  async update(
    id: DataRoom['id'],

    updateDataRoomDto: UpdateDataRoomDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let owner: User | undefined = undefined;

    if (updateDataRoomDto.owner) {
      const ownerObject = await this.userService.findById(
        updateDataRoomDto.owner.id,
      );
      if (!ownerObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            owner: 'notExists',
          },
        });
      }
      owner = ownerObject;
    }

    return this.dataRoomRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      owner,

      name: updateDataRoomDto.name,
    });
  }

  remove(id: DataRoom['id']) {
    return this.dataRoomRepository.remove(id);
  }

  // ---------------------------------------------------------------------------
  // Hand-written business logic (not generator output) — mirrors the frontend's
  // src/lib/store/repository.ts 1:1 per the contract documented in CLAUDE.md.
  // No server-side cross-tab locking is implemented here (the frontend's
  // viewLock.ts stays a client-only, single-browser concern for this pass).
  // ---------------------------------------------------------------------------

  /** Loads a dataroom and throws NotFoundException (not Forbidden — don't leak
   * existence of other users' rooms) unless it's owned by `userId`. */
  async findOwnedOrThrow(
    id: string,
    userId: number | string,
  ): Promise<DataRoom> {
    const room = await this.dataRoomRepository.findById(id);
    if (!room || room.owner?.id !== userId) {
      throw new NotFoundException();
    }
    return room;
  }

  async listDataRooms(userId: number | string): Promise<DataRoom[]> {
    return this.dataRoomRepository.findAllByOwner(userId);
  }

  async countChildren(id: string, userId: number | string): Promise<number> {
    await this.findOwnedOrThrow(id, userId);
    return this.nodesService.countChildrenOfDataRoom(id);
  }

  async createDataRoom(
    name: string,
    userId: number | string,
  ): Promise<DataRoom> {
    const existing = await this.dataRoomRepository.findAllByOwner(userId);
    const finalName = resolveUniqueName(
      existing.map((r) => r.name),
      name.trim(),
    );
    return this.dataRoomRepository.create({
      name: finalName,
      owner: { id: userId } as User,
    });
  }

  async renameDataRoom(
    id: string,
    newName: string,
    userId: number | string,
  ): Promise<DataRoom> {
    await this.findOwnedOrThrow(id, userId);
    const trimmed = newName.trim();
    const siblings = await this.dataRoomRepository.findAllByOwner(userId);
    assertNoNameCollision(
      siblings.filter((r) => r.id !== id).map((r) => r.name),
      trimmed,
    );
    const updated = await this.dataRoomRepository.update(id, {
      name: trimmed,
    });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async deleteDataRoom(id: string, userId: number | string): Promise<void> {
    await this.findOwnedOrThrow(id, userId);
    const subtree = await this.nodesService.collectSubtree(id, id);
    const fileKeys = subtree
      .filter((n) => n.type === 'file' && n.s3Key)
      .map((n) => n.s3Key as string);
    await Promise.all(
      fileKeys.map((key) => this.nodeStorageService.deleteObject(key)),
    );
    await Promise.all(subtree.map((n) => this.nodesService.remove(n.id)));
    await this.dataRoomRepository.remove(id);
  }
}
