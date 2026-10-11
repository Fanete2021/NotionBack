import { PageSearchType } from '../dto/search-pages-query.dto';
import { PageSearchPathItemEntity } from '../entities';

export interface PageSearchParams {
  q: string;
  type: PageSearchType;
  projectId?: string;
  from?: Date;
  to?: Date;
  limit: number;
}

export interface PageSearchRow {
  id: string;
  workspaceId: string;
  projectId: string | null;
  parentPageId: string | null;
  title: string;
  icon: string | null;
  type: string;
  updatedAt: Date;
  titleMatch: boolean;
  pos: number;
  snippet: string | null;
  path: PageSearchPathItemEntity[];
}

export interface PageSearchPageChainRow {
  leafId: string;
  id: string;
  parentPageId: string | null;
  title: string;
  depth: number;
}

export interface PageSearchProjectChainRow {
  leafId: string;
  id: string;
  name: string;
  depth: number;
}
