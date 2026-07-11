import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NodeEntity } from '../entities/node.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Node } from '../../../../domain/node';
import { NodeRepository } from '../../node.repository';
import { NodeMapper } from '../mappers/node.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class NodeRelationalRepository implements NodeRepository {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodeRepository: Repository<NodeEntity>,
  ) {}

  async create(data: Node): Promise<Node> {
    const persistenceModel = NodeMapper.toPersistence(data);
    const newEntity = await this.nodeRepository.save(
      this.nodeRepository.create(persistenceModel),
    );
    return NodeMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Node[]> {
    const entities = await this.nodeRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => NodeMapper.toDomain(entity));
  }

  async findById(id: Node['id']): Promise<NullableType<Node>> {
    const entity = await this.nodeRepository.findOne({
      where: { id },
      relations: ['dataRoom', 'dataRoom.owner'],
    });

    return entity ? NodeMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Node['id'][]): Promise<Node[]> {
    const entities = await this.nodeRepository.find({
      where: { id: In(ids) },
      relations: ['dataRoom', 'dataRoom.owner'],
    });

    return entities.map((entity) => NodeMapper.toDomain(entity));
  }

  async findChildren(dataRoomId: string, parentId: string): Promise<Node[]> {
    const entities = await this.nodeRepository.find({
      where: { parentId, dataRoom: { id: dataRoomId } },
      relations: ['dataRoom', 'dataRoom.owner'],
    });

    return entities.map((entity) => NodeMapper.toDomain(entity));
  }

  async findConfirmedChildren(
    dataRoomId: string,
    parentId: string,
  ): Promise<Node[]> {
    const entities = await this.nodeRepository.find({
      where: { parentId, dataRoom: { id: dataRoomId }, confirmed: true },
      relations: ['dataRoom', 'dataRoom.owner'],
    });

    return entities.map((entity) => NodeMapper.toDomain(entity));
  }

  async update(id: Node['id'], payload: Partial<Node>): Promise<Node> {
    const entity = await this.nodeRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.nodeRepository.save(
      this.nodeRepository.create(
        NodeMapper.toPersistence({
          ...NodeMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return NodeMapper.toDomain(updatedEntity);
  }

  async remove(id: Node['id']): Promise<void> {
    await this.nodeRepository.delete(id);
  }
}
