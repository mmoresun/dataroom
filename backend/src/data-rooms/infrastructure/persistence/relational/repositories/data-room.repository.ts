import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DataRoomEntity } from '../entities/data-room.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { DataRoom } from '../../../../domain/data-room';
import { DataRoomRepository } from '../../data-room.repository';
import { DataRoomMapper } from '../mappers/data-room.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class DataRoomRelationalRepository implements DataRoomRepository {
  constructor(
    @InjectRepository(DataRoomEntity)
    private readonly dataRoomRepository: Repository<DataRoomEntity>,
  ) {}

  async create(data: DataRoom): Promise<DataRoom> {
    const persistenceModel = DataRoomMapper.toPersistence(data);
    const newEntity = await this.dataRoomRepository.save(
      this.dataRoomRepository.create(persistenceModel),
    );
    return DataRoomMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<DataRoom[]> {
    const entities = await this.dataRoomRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => DataRoomMapper.toDomain(entity));
  }

  async findById(id: DataRoom['id']): Promise<NullableType<DataRoom>> {
    const entity = await this.dataRoomRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    return entity ? DataRoomMapper.toDomain(entity) : null;
  }

  async findByIds(ids: DataRoom['id'][]): Promise<DataRoom[]> {
    const entities = await this.dataRoomRepository.find({
      where: { id: In(ids) },
      relations: ['owner'],
    });

    return entities.map((entity) => DataRoomMapper.toDomain(entity));
  }

  async findAllByOwner(ownerId: number | string): Promise<DataRoom[]> {
    const entities = await this.dataRoomRepository.find({
      where: { owner: { id: ownerId as number } },
      relations: ['owner'],
      order: { name: 'ASC' },
    });

    return entities.map((entity) => DataRoomMapper.toDomain(entity));
  }

  async update(
    id: DataRoom['id'],
    payload: Partial<DataRoom>,
  ): Promise<DataRoom> {
    const entity = await this.dataRoomRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.dataRoomRepository.save(
      this.dataRoomRepository.create(
        DataRoomMapper.toPersistence({
          ...DataRoomMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return DataRoomMapper.toDomain(updatedEntity);
  }

  async remove(id: DataRoom['id']): Promise<void> {
    await this.dataRoomRepository.delete(id);
  }
}
