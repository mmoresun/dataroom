import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { DataRoom } from '../../domain/data-room';

export abstract class DataRoomRepository {
  abstract create(
    data: Omit<DataRoom, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DataRoom>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<DataRoom[]>;

  abstract findById(id: DataRoom['id']): Promise<NullableType<DataRoom>>;

  abstract findByIds(ids: DataRoom['id'][]): Promise<DataRoom[]>;

  /** All datarooms owned by the given user, sorted by name. */
  abstract findAllByOwner(ownerId: number | string): Promise<DataRoom[]>;

  abstract update(
    id: DataRoom['id'],
    payload: DeepPartial<DataRoom>,
  ): Promise<DataRoom | null>;

  abstract remove(id: DataRoom['id']): Promise<void>;
}
