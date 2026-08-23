import { Injectable } from '@nestjs/common';
import { Attachment } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    pageId: string;
    workspaceId: string;
    uploadedBy: string;
    fileName: string;
    contentType: string;
    size: number;
    key: string;
  }): Promise<Attachment> {
    return this.prisma.attachment.create({ data });
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findUnique({ where: { id } });
  }

  async markConfirmed(id: string): Promise<Attachment> {
    return this.prisma.attachment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attachment.delete({ where: { id } });
  }
}
