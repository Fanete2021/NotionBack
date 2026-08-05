import { buildProjectTree } from './build-project-tree';
import { ProjectEntity } from '../entities/project.entity';

describe('buildProjectTree', () => {
  const makeEntity = (
    id: string,
    parentProjectId: string | null = null,
  ): ProjectEntity =>
    new ProjectEntity(
      id,
      'ws-1',
      parentProjectId,
      `Project ${id}`,
      null,
      null,
      0,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-01T00:00:00.000Z'),
    );

  it('возвращает пустой массив для пустого входа', () => {
    expect(buildProjectTree([])).toEqual([]);
  });

  it('собирает корневые проекты как есть', () => {
    const a = makeEntity('a');
    const b = makeEntity('b');

    const tree = buildProjectTree([a, b]);

    expect(tree).toHaveLength(2);
    expect(tree.map((p) => p.id)).toEqual(['a', 'b']);
    expect(tree[0].childProjects).toEqual([]);
  });

  it('вкладывает дочерние проекты по parentProjectId', () => {
    const root = makeEntity('root');
    const child = makeEntity('child', 'root');
    const grandchild = makeEntity('grandchild', 'child');

    const tree = buildProjectTree([root, child, grandchild]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect(tree[0].childProjects).toHaveLength(1);
    expect(tree[0].childProjects[0].id).toBe('child');
    expect(tree[0].childProjects[0].childProjects[0].id).toBe('grandchild');
  });

  it('не создаёт циклов при битом parentProjectId (детей нет)', () => {
    const child = makeEntity('child', 'missing-parent');

    const tree = buildProjectTree([child]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('child');
    expect(tree[0].childProjects).toEqual([]);
  });

  it('сохраняет исходный порядок корней', () => {
    const a = makeEntity('a');
    const b = makeEntity('b');
    const c = makeEntity('c');

    const tree = buildProjectTree([b, a, c]);

    expect(tree.map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });
});
