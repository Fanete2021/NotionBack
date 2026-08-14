import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProjectEntity } from './entities/project.entity';
import {
  ApiProjectNotFound,
  ApiWorkspaceMemberForbidden,
} from '../../common/decorators/api-responses.decorator';

@ApiBearerAuth()
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({
    status: 200,
    description: 'Project found',
    type: ProjectEntity,
  })
  @ApiWorkspaceMemberForbidden()
  @ApiProjectNotFound()
  async findById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ProjectEntity> {
    return this.projectsService.findById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({
    status: 200,
    description: 'Project updated',
    type: ProjectEntity,
  })
  @ApiWorkspaceMemberForbidden()
  @ApiResponse({
    status: 400,
    description: 'Parent project not in the same workspace',
  })
  @ApiProjectNotFound()
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    return this.projectsService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', type: String, description: 'Project id' })
  @ApiResponse({ status: 204, description: 'Project deleted' })
  @ApiWorkspaceMemberForbidden()
  @ApiProjectNotFound()
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.projectsService.delete(userId, id);
  }
}
