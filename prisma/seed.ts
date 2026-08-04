import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const DEMO_EMAIL = 'demo@notion.com';
const DEMO_PASSWORD = 'demo1234';
const MEMBER_EMAIL = 'member@notion.com';
const MEMBER_PASSWORD = 'member1234';
const BCRYPT_SALT_ROUNDS = 10;

const DATABASE_URL =
  process.env.DATABASE_URL ??
  (() => {
    throw new Error('DATABASE_URL is not set');
  })();

async function main() {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const demoUser = await prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: {
        email: DEMO_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS),
        name: 'Demo User',
      },
    });

    const memberUser = await prisma.user.upsert({
      where: { email: MEMBER_EMAIL },
      update: {},
      create: {
        email: MEMBER_EMAIL,
        passwordHash: await bcrypt.hash(MEMBER_PASSWORD, BCRYPT_SALT_ROUNDS),
        name: 'Member User',
      },
    });

    const existingWorkspace = await prisma.workspace.findFirst({
      where: { ownerId: demoUser.id },
    });

    if (existingWorkspace) {
      console.log('Seed skipped: demo workspace already exists.');
      return;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Demo Workspace',
        ownerId: demoUser.id,
        members: {
          create: [
            { userId: demoUser.id, role: 'OWNER' },
            { userId: memberUser.id, role: 'MEMBER' },
          ],
        },
      },
    });

    const mainProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Главная',
        position: 0,
      },
    });

    const developmentProject = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Разработка',
        position: 1,
      },
    });

    await prisma.project.createMany({
      data: [
        {
          workspaceId: workspace.id,
          parentProjectId: developmentProject.id,
          name: 'Бэкенд',
          position: 0,
        },
        {
          workspaceId: workspace.id,
          parentProjectId: developmentProject.id,
          name: 'Фронтенд',
          position: 1,
        },
      ],
    });

    await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        name: 'Личное',
        position: 2,
      },
    });

    const welcomePage = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        projectId: mainProject.id,
        title: 'Добро пожаловать',
        position: 0,
        authorId: demoUser.id,
        content: {
          create: {
            json: {
              type: 'doc',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 1 },
                  content: [{ type: 'text', text: 'Добро пожаловать!' }],
                },
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: 'Это демо-страница для проверки API.',
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    });

    await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        projectId: mainProject.id,
        parentPageId: welcomePage.id,
        title: 'Подзадача',
        position: 1,
        authorId: demoUser.id,
      },
    });

    const roadmapPage = await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        projectId: developmentProject.id,
        title: 'Roadmap',
        position: 0,
        authorId: demoUser.id,
        content: {
          create: {
            json: {
              type: 'doc',
              content: [
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'MVP' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    });

    await prisma.page.create({
      data: {
        workspaceId: workspace.id,
        projectId: developmentProject.id,
        title: 'Заметки',
        position: 1,
        authorId: memberUser.id,
      },
    });

    console.log(`Seed finished:
  workspace: ${workspace.id}
  users: ${DEMO_EMAIL} / ${DEMO_PASSWORD}, ${MEMBER_EMAIL} / ${MEMBER_PASSWORD}
  projects: 5 (1 with children)
  pages: 4 (1 nested, 2 with content)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
