jest.mock('./pages-version', () => ({ PagesVersionService: class {} }));

import { Role } from '@prisma/client';
import { Subject } from 'rxjs';
import { PagesGateway } from './pages.gateway';

const PAGE_ID = 'page-1';

type Emitter = { except: jest.Mock; emit: jest.Mock };

describe('PagesGateway', () => {
  let gateway: PagesGateway;

  const pagesService = { findById: jest.fn() };
  const workspacesService = { findMemberRole: jest.fn() };
  const yjsDocService = {
    acquire: jest.fn(),
    getState: jest.fn(),
    release: jest.fn(),
    applyUpdate: jest.fn(),
    applyAwareness: jest.fn(),
    getAwarenessState: jest.fn(),
    removeAwareness: jest.fn(),
    serverUpdates$: new Subject<{ pageId: string; update: Uint8Array }>(),
  };
  const logger = { warn: jest.fn(), error: jest.fn() };

  const roomEmitter: Emitter = { except: jest.fn(), emit: jest.fn() };
  const directEmit = jest.fn();
  const server = {
    in: jest.fn(),
    to: jest.fn(),
  };

  const makeClient = (id = 'socket-1') => ({
    id,
    data: { user: { id: 'user-1', name: 'User', avatar: null } },
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    pagesService.findById.mockResolvedValue({
      id: PAGE_ID,
      workspaceId: 'ws-1',
    });
    workspacesService.findMemberRole.mockResolvedValue(Role.EDITOR);
    yjsDocService.acquire.mockResolvedValue(new Uint8Array([1, 2]));
    yjsDocService.getState.mockResolvedValue(new Uint8Array([1, 2]));
    yjsDocService.release.mockResolvedValue(undefined);
    yjsDocService.getAwarenessState.mockReturnValue(null);
    yjsDocService.removeAwareness.mockReturnValue(null);

    roomEmitter.except.mockReturnValue(roomEmitter);
    server.in.mockReturnValue(roomEmitter);
    server.to.mockReturnValue({ emit: directEmit });

    gateway = new PagesGateway(
      {} as never,
      {} as never,
      logger as never,
      pagesService as never,
      workspacesService as never,
      yjsDocService as never,
    );
    (gateway as unknown as { server: unknown }).server = server;
    gateway.afterInit({ use: jest.fn() } as never);
  });

  afterEach(() => {
    gateway.onModuleDestroy();
  });

  describe('page:join', () => {
    it('joins, sends the Yjs state and reports edit rights', async () => {
      const client = makeClient();

      const result = await gateway.handleJoin(client as never, {
        pageId: PAGE_ID,
      });

      expect(result).toMatchObject({ ok: true, canEdit: true });
      expect(yjsDocService.acquire).toHaveBeenCalledWith(PAGE_ID);
      expect(directEmit).toHaveBeenCalledWith(
        'yjs:sync',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });

    it('rejects users who are not workspace members', async () => {
      workspacesService.findMemberRole.mockResolvedValue(null);
      const client = makeClient();

      const result = await gateway.handleJoin(client as never, {
        pageId: PAGE_ID,
      });

      expect(result).toEqual({ ok: false, error: 'Forbidden' });
      expect(client.join).not.toHaveBeenCalled();
      expect(yjsDocService.acquire).not.toHaveBeenCalled();
    });

    it('rejects unknown pages', async () => {
      pagesService.findById.mockRejectedValue(new Error('not found'));

      const result = await gateway.handleJoin(makeClient() as never, {
        pageId: PAGE_ID,
      });

      expect(result).toEqual({ ok: false, error: 'Page not found' });
    });

    it('does not take another doc reference on repeated join', async () => {
      const client = makeClient();

      await gateway.handleJoin(client as never, { pageId: PAGE_ID });
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      expect(yjsDocService.acquire).toHaveBeenCalledTimes(1);
      expect(yjsDocService.getState).toHaveBeenCalledTimes(1);
    });
  });

  describe('yjs:update', () => {
    const update = Buffer.from([1, 2, 3]);

    it('applies the update and broadcasts it to the other clients', async () => {
      const client = makeClient();
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      const result = gateway.handleYjsUpdate(client as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(result).toEqual({ ok: true });
      expect(yjsDocService.applyUpdate).toHaveBeenCalledWith(
        PAGE_ID,
        update,
        'user-1',
      );
      expect(roomEmitter.except).toHaveBeenCalledWith(client.id);
      expect(roomEmitter.emit).toHaveBeenCalledWith(
        'yjs:update',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });

    it('rejects updates from a client that has not joined', () => {
      const result = gateway.handleYjsUpdate(makeClient() as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(result).toMatchObject({ ok: false });
      expect(yjsDocService.applyUpdate).not.toHaveBeenCalled();
    });

    it('rejects updates from viewers', async () => {
      workspacesService.findMemberRole.mockResolvedValue(Role.VIEWER);
      const client = makeClient();
      const joined = await gateway.handleJoin(client as never, {
        pageId: PAGE_ID,
      });

      const result = gateway.handleYjsUpdate(client as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(joined).toMatchObject({ ok: true, canEdit: false });
      expect(result).toEqual({ ok: false, error: 'Read-only access' });
      expect(yjsDocService.applyUpdate).not.toHaveBeenCalled();
    });

    it('rejects malformed payloads', async () => {
      const client = makeClient();
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      const result = gateway.handleYjsUpdate(client as never, {
        pageId: PAGE_ID,
        update: 'not binary',
      });

      expect(result).toEqual({ ok: false, error: 'Invalid update' });
    });

    it('does not broadcast an update the document refused', async () => {
      yjsDocService.applyUpdate.mockImplementation(() => {
        throw new Error('bad update');
      });
      const client = makeClient();
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      const result = gateway.handleYjsUpdate(client as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(result).toEqual({ ok: false, error: 'Invalid update' });
      expect(roomEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('yjs:awareness', () => {
    const update = Buffer.from([9, 9]);

    it('relays cursors from any joined member, including viewers', async () => {
      workspacesService.findMemberRole.mockResolvedValue(Role.VIEWER);
      const client = makeClient();
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      const result = gateway.handleYjsAwareness(client as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(result).toEqual({ ok: true });
      expect(yjsDocService.applyAwareness).toHaveBeenCalledWith(
        PAGE_ID,
        update,
        client.id,
      );
      expect(roomEmitter.except).toHaveBeenCalledWith(client.id);
      expect(roomEmitter.emit).toHaveBeenCalledWith(
        'yjs:awareness',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });

    it('rejects awareness from a client that has not joined', () => {
      const result = gateway.handleYjsAwareness(makeClient() as never, {
        pageId: PAGE_ID,
        update,
      });

      expect(result).toMatchObject({ ok: false });
      expect(yjsDocService.applyAwareness).not.toHaveBeenCalled();
    });

    it('sends existing cursors to a newcomer', async () => {
      yjsDocService.getAwarenessState.mockReturnValue(new Uint8Array([5]));

      await gateway.handleJoin(makeClient() as never, { pageId: PAGE_ID });

      expect(directEmit).toHaveBeenCalledWith(
        'yjs:awareness',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });

    it('removes cursors of a client that disconnects', async () => {
      yjsDocService.removeAwareness.mockReturnValue(new Uint8Array([7]));
      const client = makeClient();
      await gateway.handleJoin(client as never, { pageId: PAGE_ID });

      await gateway.handleDisconnect(client as never);

      expect(yjsDocService.removeAwareness).toHaveBeenCalledWith(
        PAGE_ID,
        client.id,
      );
      expect(roomEmitter.emit).toHaveBeenCalledWith(
        'yjs:awareness',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });
  });

  describe('server-side changes', () => {
    it('broadcasts a restored document to every participant', () => {
      const update = new Uint8Array([1, 2, 3]);

      yjsDocService.serverUpdates$.next({ pageId: PAGE_ID, update });

      expect(server.in).toHaveBeenCalledWith(`page:${PAGE_ID}`);
      expect(roomEmitter.emit).toHaveBeenCalledWith(
        'yjs:update',
        expect.objectContaining({ pageId: PAGE_ID }),
      );
    });
  });

  describe('release', () => {
    it('releases the doc on leave and on disconnect', async () => {
      const left = makeClient('socket-a');
      await gateway.handleJoin(left as never, { pageId: PAGE_ID });
      await gateway.handleLeave(left as never, { pageId: PAGE_ID });
      expect(yjsDocService.release).toHaveBeenCalledTimes(1);

      const dropped = makeClient('socket-b');
      await gateway.handleJoin(dropped as never, { pageId: PAGE_ID });
      await gateway.handleDisconnect(dropped as never);
      expect(yjsDocService.release).toHaveBeenCalledTimes(2);
    });

    it('does not release a doc the client never joined', async () => {
      await gateway.handleLeave(makeClient() as never, { pageId: PAGE_ID });

      expect(yjsDocService.release).not.toHaveBeenCalled();
    });
  });
});
