import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NodesService } from './nodes.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameNodeDto } from './dto/rename-node.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { RequestUploadResponseDto } from './dto/request-upload-response.dto';
import { DownloadUrlResponseDto } from './dto/download-url-response.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Node } from './domain/node';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Nodes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'nodes',
  version: '1',
})
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  @ApiOkResponse({ type: [Node] })
  listChildren(
    @Request() request,
    @Query('dataRoomId') dataRoomId: string,
    @Query('parentId') parentId: string,
  ) {
    return this.nodesService.listChildren(
      dataRoomId,
      parentId,
      request.user.id,
    );
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Node })
  findById(@Request() request, @Param('id') id: string) {
    return this.nodesService.findOwnedOrThrow(id, request.user.id);
  }

  @Get(':id/children-count')
  @ApiParam({ name: 'id', type: String })
  async countChildren(@Request() request, @Param('id') id: string) {
    const count = await this.nodesService.countChildren(id, request.user.id);
    return { count };
  }

  @Get(':id/breadcrumb')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [Node] })
  getBreadcrumb(
    @Request() request,
    @Param('id') id: string,
    @Query('rootId') rootId: string,
  ) {
    return this.nodesService.getBreadcrumb(id, rootId, request.user.id);
  }

  @Post('folders')
  @ApiCreatedResponse({ type: Node })
  createFolder(@Request() request, @Body() dto: CreateFolderDto) {
    return this.nodesService.createFolder(
      dto.name,
      dto.parentId,
      dto.dataRoomId,
      request.user.id,
    );
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Node })
  renameNode(
    @Request() request,
    @Param('id') id: string,
    @Body() dto: RenameNodeDto,
  ) {
    return this.nodesService.renameNode(id, dto.name, request.user.id);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: String })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNode(@Request() request, @Param('id') id: string) {
    return this.nodesService.deleteNode(id, request.user.id);
  }

  @Post('upload-requests')
  @ApiCreatedResponse({ type: RequestUploadResponseDto })
  requestUpload(@Request() request, @Body() dto: RequestUploadDto) {
    return this.nodesService.requestUpload(
      dto.fileName,
      dto.fileSize,
      dto.mimeType,
      dto.parentId,
      dto.dataRoomId,
      request.user.id,
    );
  }

  @Post(':id/confirm-upload')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Node })
  confirmUpload(@Request() request, @Param('id') id: string) {
    return this.nodesService.confirmUpload(id, request.user.id);
  }

  @Get(':id/download-url')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DownloadUrlResponseDto })
  async getDownloadUrl(@Request() request, @Param('id') id: string) {
    const url = await this.nodesService.getDownloadUrl(id, request.user.id);
    return { url };
  }
}
