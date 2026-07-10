// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateDataRoomDto } from './create-data-room.dto';

export class UpdateDataRoomDto extends PartialType(CreateDataRoomDto) {}
