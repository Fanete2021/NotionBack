import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ListPageCommentsQueryDto } from '@modules/page-comments/dto/list-page-comments-query.dto';

describe('ListPageCommentsQueryDto', () => {
  it('принимает resolved=true и resolved=false', async () => {
    for (const resolved of ['true', 'false'] as const) {
      const dto = plainToInstance(ListPageCommentsQueryDto, { resolved });
      await expect(validate(dto)).resolves.toHaveLength(0);
    }
  });

  it('отклоняет некорректный resolved', async () => {
    const dto = plainToInstance(ListPageCommentsQueryDto, {
      resolved: 'maybe',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
