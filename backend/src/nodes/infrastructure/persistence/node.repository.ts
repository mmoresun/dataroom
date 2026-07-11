import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Node } from '../../domain/node';

export abstract class NodeRepository {
  abstract create(
    data: Omit<Node, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Node>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Node[]>;

  abstract findById(id: Node['id']): Promise<NullableType<Node>>;

  abstract findByIds(ids: Node['id'][]): Promise<Node[]>;

  /** Direct children of `parentId` within `dataRoomId` (folders and files alike),
   * including unconfirmed (not-yet-uploaded) files — use for cascade-delete/subtree
   * collection and sibling name-collision checks, never for anything user-facing. */
  abstract findChildren(dataRoomId: string, parentId: string): Promise<Node[]>;

  /** Same as `findChildren`, but excludes files still pending upload confirmation —
   * use this for anything shown to the user (listings, counts). */
  abstract findConfirmedChildren(
    dataRoomId: string,
    parentId: string,
  ): Promise<Node[]>;

  abstract update(
    id: Node['id'],
    payload: DeepPartial<Node>,
  ): Promise<Node | null>;

  abstract remove(id: Node['id']): Promise<void>;
}
