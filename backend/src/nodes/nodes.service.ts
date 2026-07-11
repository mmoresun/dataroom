import { DataRoomRepository } from '../data-rooms/infrastructure/persistence/data-room.repository';
import { DataRoom } from '../data-rooms/domain/data-room';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { NodeRepository } from './infrastructure/persistence/node.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { Node } from './domain/node';
import { NodeStorageService } from './node-storage.service';
import {
  resolveUniqueName,
  assertNoNameCollision,
} from '../utils/unique-name.util';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

@Injectable()
export class NodesService {
  constructor(
    // Depends on the DataRoom *repository port*, not DataRoomsService — DataRoomsModule
    // depends on NodesModule (to reuse collectSubtree for cascade delete), so depending
    // on the concrete service here would create a circular module dependency.
    private readonly dataRoomRepository: DataRoomRepository,

    // Dependencies here
    private readonly nodeRepository: NodeRepository,
    private readonly nodeStorageService: NodeStorageService,
  ) {}

  async create(createNodeDto: CreateNodeDto) {
    // Do not remove comment below.
    // <creating-property />

    let dataRoom: DataRoom | undefined = undefined;

    if (createNodeDto.dataRoom) {
      const dataRoomObject = await this.dataRoomRepository.findById(
        createNodeDto.dataRoom.id,
      );
      if (!dataRoomObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            dataRoom: 'notExists',
          },
        });
      }
      dataRoom = dataRoomObject;
    }

    return this.nodeRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      s3Key: createNodeDto.s3Key,

      mimeType: createNodeDto.mimeType,

      size: createNodeDto.size,

      dataRoom,

      parentId: createNodeDto.parentId,

      name: createNodeDto.name,

      type: createNodeDto.type,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.nodeRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: Node['id']) {
    return this.nodeRepository.findById(id);
  }

  findByIds(ids: Node['id'][]) {
    return this.nodeRepository.findByIds(ids);
  }

  async update(
    id: Node['id'],

    updateNodeDto: UpdateNodeDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let dataRoom: DataRoom | undefined = undefined;

    if (updateNodeDto.dataRoom) {
      const dataRoomObject = await this.dataRoomRepository.findById(
        updateNodeDto.dataRoom.id,
      );
      if (!dataRoomObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            dataRoom: 'notExists',
          },
        });
      }
      dataRoom = dataRoomObject;
    }

    return this.nodeRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      s3Key: updateNodeDto.s3Key,

      mimeType: updateNodeDto.mimeType,

      size: updateNodeDto.size,

      dataRoom,

      parentId: updateNodeDto.parentId,

      name: updateNodeDto.name,

      type: updateNodeDto.type,
    });
  }

  remove(id: Node['id']) {
    return this.nodeRepository.remove(id);
  }

  // ---------------------------------------------------------------------------
  // Hand-written business logic (not generator output) — mirrors the frontend's
  // src/lib/store/repository.ts 1:1 per the contract documented in CLAUDE.md.
  // No server-side cross-tab locking is implemented here (the frontend's
  // viewLock.ts stays a client-only, single-browser concern for this pass).
  // ---------------------------------------------------------------------------

  /** Loads a node and throws NotFoundException (not Forbidden — don't leak existence
   * of other users' data) unless it belongs to a dataroom owned by `userId`. */
  async findOwnedOrThrow(id: string, userId: number | string): Promise<Node> {
    const node = await this.nodeRepository.findById(id);
    if (!node || !node.dataRoom || node.dataRoom.owner?.id !== userId) {
      throw new NotFoundException();
    }
    return node;
  }

  /** Verifies `parentId` is either the dataroom's own id (top-level) or a real folder
   * within that same dataroom, owned by `userId`. Throws NotFoundException otherwise —
   * this is what stops a user from attaching a node under another user's folder/room. */
  private async assertValidParent(
    dataRoomId: string,
    parentId: string,
    userId: number | string,
  ): Promise<void> {
    if (parentId === dataRoomId) return;
    const parent = await this.findOwnedOrThrow(parentId, userId);
    if (parent.type !== 'folder' || parent.dataRoom?.id !== dataRoomId) {
      throw new NotFoundException();
    }
  }

  async listChildren(
    dataRoomId: string,
    parentId: string,
    userId: number | string,
  ): Promise<Node[]> {
    await this.assertValidParent(dataRoomId, parentId, userId);
    const children = await this.nodeRepository.findConfirmedChildren(
      dataRoomId,
      parentId,
    );
    return children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  async countChildren(id: string, userId: number | string): Promise<number> {
    const node = await this.findOwnedOrThrow(id, userId);
    const children = await this.nodeRepository.findConfirmedChildren(
      node.dataRoom!.id,
      id,
    );
    return children.length;
  }

  /** Direct child count of a dataroom's own (virtual) root — `id` here is a DataRoom's
   * id, not a Node's, so this can't reuse findOwnedOrThrow/countChildren above. Ownership
   * of the room itself is the caller's responsibility (DataRoomsService already checks it). */
  async countChildrenOfDataRoom(dataRoomId: string): Promise<number> {
    const children = await this.nodeRepository.findConfirmedChildren(
      dataRoomId,
      dataRoomId,
    );
    return children.length;
  }

  async getBreadcrumb(
    id: string,
    rootId: string,
    userId: number | string,
  ): Promise<Node[]> {
    // When browsing a dataroom's own (virtual) root, `id === rootId` and `id` is a
    // DataRoom id, not a Node id — findOwnedOrThrow would look it up in the wrong
    // table and 404. Short-circuit to the documented empty-breadcrumb contract instead.
    if (id === rootId) {
      const room = await this.dataRoomRepository.findById(rootId);
      if (!room || room.owner?.id !== userId) throw new NotFoundException();
      return [];
    }
    await this.findOwnedOrThrow(id, userId);
    const path: Node[] = [];
    let currentId = id;
    const visited = new Set<string>();
    while (currentId !== rootId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const node = await this.nodeRepository.findById(currentId);
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;
    }
    return path;
  }

  /** Recursively collects every descendant (files and folders) of `parentId`, not including itself. */
  async collectSubtree(dataRoomId: string, parentId: string): Promise<Node[]> {
    const children = await this.nodeRepository.findChildren(
      dataRoomId,
      parentId,
    );
    const all: Node[] = [...children];
    for (const child of children) {
      if (child.type === 'folder') {
        all.push(...(await this.collectSubtree(dataRoomId, child.id)));
      }
    }
    return all;
  }

  async createFolder(
    name: string,
    parentId: string,
    dataRoomId: string,
    userId: number | string,
  ): Promise<Node> {
    await this.assertValidParent(dataRoomId, parentId, userId);
    const siblings = await this.nodeRepository.findChildren(
      dataRoomId,
      parentId,
    );
    const finalName = resolveUniqueName(
      siblings.map((s) => s.name),
      name.trim(),
    );
    return this.nodeRepository.create({
      type: 'folder',
      name: finalName,
      parentId,
      dataRoom: { id: dataRoomId } as DataRoom,
      size: null,
      mimeType: null,
      s3Key: null,
    });
  }

  async renameNode(
    id: string,
    newName: string,
    userId: number | string,
  ): Promise<Node> {
    const node = await this.findOwnedOrThrow(id, userId);
    const trimmed = newName.trim();
    const siblings = await this.nodeRepository.findChildren(
      node.dataRoom!.id,
      node.parentId,
    );
    assertNoNameCollision(
      siblings.filter((s) => s.id !== id).map((s) => s.name),
      trimmed,
    );
    const updated = await this.nodeRepository.update(id, { name: trimmed });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  async deleteNode(id: string, userId: number | string): Promise<void> {
    const node = await this.findOwnedOrThrow(id, userId);
    const subtree =
      node.type === 'folder'
        ? await this.collectSubtree(node.dataRoom!.id, id)
        : [];
    const fileNodes = [node, ...subtree].filter((n) => n.type === 'file');
    await Promise.all(
      fileNodes
        .filter((f) => f.s3Key)
        .map((f) => this.nodeStorageService.deleteObject(f.s3Key as string)),
    );
    await Promise.all(
      [node, ...subtree].map((n) => this.nodeRepository.remove(n.id)),
    );
  }

  // --- Presigned S3 upload/download flow ---

  async requestUpload(
    fileName: string,
    fileSize: number,
    mimeType: string,
    parentId: string,
    dataRoomId: string,
    userId: number | string,
  ): Promise<{ fileId: string; uploadUrl: string }> {
    const isPdf =
      mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'invalidFileType' },
      });
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    }

    await this.assertValidParent(dataRoomId, parentId, userId);
    const allSiblings = await this.nodeRepository.findChildren(
      dataRoomId,
      parentId,
    );

    // Opportunistic cleanup: a node row is created below before the client actually
    // PUTs bytes to S3, so an abandoned/failed upload (network blip, closed tab, CORS
    // misconfig, ...) leaves a permanently-unconfirmed row behind. The presigned PUT
    // URL itself expires after an hour (see NodeStorageService), so anything still
    // unconfirmed past that point can never be completed — safe to drop. Piggybacked
    // here rather than a separate cron job, since this app has no task queue.
    const STALE_UPLOAD_MS = 60 * 60 * 1000;
    const now = Date.now();
    const siblings: Node[] = [];
    for (const sibling of allSiblings) {
      if (
        sibling.type === 'file' &&
        sibling.confirmed === false &&
        now - new Date(sibling.createdAt).getTime() > STALE_UPLOAD_MS
      ) {
        await this.nodeRepository.remove(sibling.id);
      } else {
        siblings.push(sibling);
      }
    }

    const finalName = resolveUniqueName(
      siblings.map((s) => s.name),
      fileName,
    );

    const s3Key = `${randomStringGenerator()}.pdf`;
    const node = await this.nodeRepository.create({
      type: 'file',
      name: finalName,
      parentId,
      dataRoom: { id: dataRoomId } as DataRoom,
      size: fileSize,
      mimeType,
      s3Key,
      confirmed: false,
    });

    const uploadUrl = await this.nodeStorageService.presignUpload(
      s3Key,
      fileSize,
    );
    return { fileId: node.id, uploadUrl };
  }

  async confirmUpload(id: string, userId: number | string): Promise<Node> {
    const node = await this.findOwnedOrThrow(id, userId);
    if (!node.s3Key) throw new NotFoundException();
    const head = await this.nodeStorageService.headObject(node.s3Key);
    if (!head) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { file: 'uploadNotFound' },
      });
    }
    const updated = await this.nodeRepository.update(id, { confirmed: true });
    return updated ?? node;
  }

  async getDownloadUrl(id: string, userId: number | string): Promise<string> {
    const node = await this.findOwnedOrThrow(id, userId);
    if (!node.s3Key) throw new NotFoundException();
    return this.nodeStorageService.presignDownload(node.s3Key);
  }
}
