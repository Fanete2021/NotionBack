import { ProjectEntity } from '../entities/project.entity';

export function buildProjectTree(projects: ProjectEntity[]): ProjectEntity[] {
  const children = new Map<string, ProjectEntity[]>();
  const projectIds = new Set(projects.map((project) => project.id));
  const roots: ProjectEntity[] = [];

  for (const project of projects) {
    if (project.parentProjectId && projectIds.has(project.parentProjectId)) {
      const siblings = children.get(project.parentProjectId) ?? [];
      siblings.push(project);
      children.set(project.parentProjectId, siblings);
    } else {
      roots.push(project);
    }
  }

  const attach = (project: ProjectEntity): ProjectEntity => {
    project.childProjects = (children.get(project.id) ?? []).map(attach);
    return project;
  };

  return roots.map(attach);
}
