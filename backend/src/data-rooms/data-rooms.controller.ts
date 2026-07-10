import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomBodyDto } from './dto/create-data-room-body.dto';
import { RenameDataRoomDto } from './dto/rename-data-room.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { DataRoom } from './domain/data-room';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Datarooms')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'data-rooms',
  version: '1',
})
export class DataRoomsController {
  constructor(private readonly dataRoomsService: DataRoomsService) {}

  @Get()
  @ApiOkResponse({ type: [DataRoom] })
  listDataRooms(@Request() request) {
    return this.dataRoomsService.listDataRooms(request.user.id);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DataRoom })
  findById(@Request() request, @Param('id') id: string) {
    return this.dataRoomsService.findOwnedOrThrow(id, request.user.id);
  }

  @Get(':id/children-count')
  @ApiParam({ name: 'id', type: String })
  async countChildren(@Request() request, @Param('id') id: string) {
    const count = await this.dataRoomsService.countChildren(
      id,
      request.user.id,
    );
    return { count };
  }

  @Post()
  @ApiCreatedResponse({ type: DataRoom })
  create(@Request() request, @Body() dto: CreateDataRoomBodyDto) {
    return this.dataRoomsService.createDataRoom(dto.name, request.user.id);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DataRoom })
  rename(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: RenameDataRoomDto,
  ) {
    return this.dataRoomsService.renameDataRoom(id, dto.name, request.user.id);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() request, @Param('id') id: string) {
    return this.dataRoomsService.deleteDataRoom(id, request.user.id);
  }
}
