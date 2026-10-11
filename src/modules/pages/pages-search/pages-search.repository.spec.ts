import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma';
import { PageSearchType } from '../dto';
import {
  escapeLikePattern,
  PagesSearchRepository,
} from './pages-search.repository';

describe('PagesSearchRepository', () => {
  let repository: PagesSearchRepository;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const flattenSql = (strings: TemplateStringsArray, values: unknown[]) => {
    let sql = '';
    for (let index = 0; index < strings.length; index += 1) {
      sql += strings[index];
      if (index >= values.length) {
        continue;
      }
      const value = values[index];
      if (
        value &&
        typeof value === 'object' &&
        'strings' in value &&
        'values' in value
      ) {
        const nested = value as {
          strings: TemplateStringsArray;
          values: unknown[];
        };
        sql += flattenSql(nested.strings, nested.values);
      }
    }
    return sql;
  };

  const getSqlParts = (callIndex = 0) => {
    const [strings, ...values] = mockPrisma.$queryRaw.mock.calls[
      callIndex
    ] as unknown as [TemplateStringsArray, ...unknown[]];
    return { sql: flattenSql(strings, values), values };
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesSearchRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PagesSearchRepository);
  });

  describe('escapeLikePattern', () => {
    it('экранирует спецсимволы LIKE', () => {
      expect(escapeLikePattern('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    });
  });

  describe('search', () => {
    it('выполняет параметризованный запрос с экранированным шаблоном и лимитом', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await repository.search('ws-1', {
        q: '50%',
        type: PageSearchType.ALL,
        projectId: 'prj-1',
        limit: 10,
      });

      const { sql, values } = getSqlParts(0);
      expect(sql).toContain('ORDER BY "titleMatch" DESC, "updatedAt" DESC');
      expect(values).toContain('ws-1');
      expect(values).toContain(10);
      expect(
        values.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as { values?: unknown[] }).values?.includes('prj-1'),
        ),
      ).toBe(true);
      expect(
        values.some(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            (v as { values?: unknown[] }).values?.includes('%50\\%%'),
        ),
      ).toBe(true);
    });

    it('для type=content сортирует только по updatedAt и учитывает диапазон дат', async () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-02-01T00:00:00.000Z');
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      await repository.search('ws-1', {
        q: 'отчёт',
        type: PageSearchType.CONTENT,
        from,
        to,
        limit: 5,
      });

      const { sql, values } = getSqlParts(0);
      expect(sql).toContain('ORDER BY "updatedAt" DESC');
      expect(sql).not.toContain('ORDER BY "titleMatch" DESC');
      expect(
        values.some(
          (value) =>
            value &&
            typeof value === 'object' &&
            'values' in value &&
            (value as { values: unknown[] }).values.includes(from),
        ),
      ).toBe(true);
      expect(
        values.some(
          (value) =>
            value &&
            typeof value === 'object' &&
            'values' in value &&
            (value as { values: unknown[] }).values.includes(to),
        ),
      ).toBe(true);
    });

    it('собирает path от корневого проекта через разделы к документу', async () => {
      mockPrisma.$queryRaw
        .mockResolvedValueOnce([
          {
            id: 'page-doc',
            workspaceId: 'ws-1',
            projectId: 'prj-icons',
            parentPageId: 'page-parent',
            title: 'Кнопка',
            icon: null,
            type: 'DOC',
            updatedAt: new Date('2026-03-01T00:00:00.000Z'),
            titleMatch: false,
            pos: 1,
            snippet: 'кнопка',
          },
        ])
        .mockResolvedValueOnce([
          {
            leafId: 'page-doc',
            id: 'prj-docs',
            name: 'Документы',
            depth: 2,
          },
          {
            leafId: 'page-doc',
            id: 'prj-design',
            name: 'Дизайн-система',
            depth: 1,
          },
          {
            leafId: 'page-doc',
            id: 'prj-icons',
            name: 'Иконки',
            depth: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            leafId: 'page-doc',
            id: 'page-parent',
            parentPageId: null,
            title: 'Компоненты',
            depth: 1,
          },
          {
            leafId: 'page-doc',
            id: 'page-doc',
            parentPageId: 'page-parent',
            title: 'Кнопка',
            depth: 0,
          },
        ]);

      const [result] = await repository.search('ws-1', {
        q: 'кнопка',
        type: PageSearchType.ALL,
        limit: 10,
      });

      const { sql: projectSql } = getSqlParts(1);
      const { sql: pageSql } = getSqlParts(2);
      expect(projectSql).toContain('parentProjectId');
      expect(projectSql).toContain('WITH RECURSIVE');
      expect(pageSql).toContain('p."deletedAt" IS NULL');
      expect(result.path).toEqual([
        { type: 'project', id: 'prj-docs', name: 'Документы' },
        { type: 'project', id: 'prj-design', name: 'Дизайн-система' },
        { type: 'project', id: 'prj-icons', name: 'Иконки' },
        { type: 'page', id: 'page-parent', name: 'Компоненты' },
        { type: 'page', id: 'page-doc', name: 'Кнопка' },
      ]);
    });
  });
});
