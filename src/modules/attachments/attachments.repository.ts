import { Injectable } from '@nestjs/common';
import { Attachment, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.AttachmentUncheckedCreateInput,
  ): Promise<Attachment> {
    return this.prisma.attachment.create({ data });
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findUnique({ where: { id } });
  }

  async markConfirmed(id: string, size: number): Promise<Attachment> {
    return this.prisma.attachment.update({
      where: { id },
      data: { status: 'CONFIRMED', size },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attachment.delete({ where: { id } });
  }
}
