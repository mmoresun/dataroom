import { Module } from '@nestjs/common';
import { NodeRepository } from '../node.repository';
import { NodeRelationalRepository } from './repositories/node.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodeEntity } from './entities/node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NodeEntity])],
  providers: [
    {
      provide: NodeRepository,
      useClass: NodeRelationalRepository,
    },
  ],
  exports: [NodeRepository],
})
export class RelationalNodePersistenceModule {}
