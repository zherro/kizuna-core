import { NextResponse } from 'next/server';
import { getAuthHeaderFromCookies, getSession } from './auth';
import { pgrstRpc, pgrstTable } from './postrest/conn';
import { postgrestResources, postgrestRpcs, type ResourceConfig } from '@/lib/server/resources';

type RecordValue = Record<string, unknown>;

function getResourceConfig(resource: string) {
  const config = postgrestResources[resource];
  if (!config) return null;
  return config;
}

function parsePgError(payload: unknown) {
  const json = (payload as RecordValue | null) ?? null;
  const message =
    (json?.message as string | undefined) ?? 'Erro ao processar requisicao no PostgREST.';
  const details =
    (json?.details as string | undefined) ||
    (json?.hint as string | undefined) ||
    (json?.error as string | undefined);

  return { message, details };
}

function parseTotalFromContentRange(contentRange: string | null) {
  if (!contentRange) return 0;
  const total = contentRange.split('/').at(-1);
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parseFilterValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return 'true';
  if (normalized === 'false') return 'false';
  return value.trim();
}

function mapRows(config: ResourceConfig, rows: unknown) {
  const list = Array.isArray(rows) ? rows : [];
  return list.map((item) => {
    const record = (item ?? {}) as RecordValue;
    return config.mapOutput ? config.mapOutput(record) : record;
  });
}

function getSchemaHeaders(config: ResourceConfig, method: 'GET' | 'POST' | 'PATCH' | 'DELETE') {
  const headers: Record<string, string> = {};
  if (!config.schema) return headers;

  headers['Accept-Profile'] = config.schema;
  if (method !== 'GET') {
    headers['Content-Profile'] = config.schema;
  }

  if (config.returnRepresentation && !config?.returnCountPreferDisabled) {
    headers['Prefer'] = 'return=representation';
  }

  return headers;
}

async function ensureAuthenticated() {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { message: 'Sessao expirada. Faca login novamente.' },
        { status: 401 }
      ),
      authHeader: null as string | null,
    };
  }

  if (session.role !== 'auth_user') {
    return {
      error: NextResponse.json(
        {
          message: 'Sessao sem role autorizada para operacoes protegidas.',
          details: `Role atual: ${session.role ?? 'undefined'}`,
        },
        { status: 403 }
      ),
      authHeader: null as string | null,
    };
  }

  const authHeader = await getAuthHeaderFromCookies();
  if (!authHeader) {
    return {
      error: NextResponse.json(
        { message: 'Nao foi possivel montar o token de autenticacao.' },
        { status: 401 }
      ),
      authHeader: null as string | null,
    };
  }

  return { error: null, authHeader };
}

export async function listResource(resource: string, request: Request) {
  const config = getResourceConfig(resource);
  if (!config) {
    return NextResponse.json({ message: 'Recurso nao suportado.' }, { status: 404 });
  }
  let authHeader: string | null = null;
  if (config.listRequiresAuth ?? true) {
    const authState = await ensureAuthenticated();
    if (authState.error) return authState.error;
    authHeader = authState.authHeader;
  }

  const { searchParams } = new URL(request.url);
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const pageSize = Math.min(
    parsePositiveInt(searchParams.get('pageSize'), 20),
    config.maxPageSize ?? 100
  );
  const offset = (page - 1) * pageSize;
  const search = (searchParams.get('search') ?? '').trim();
  const orderBy = (searchParams.get('orderBy') ?? config?.defaultOrder ?? '').trim();
  const orderDirection =
    (searchParams.get('orderDirection') ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  const query = new URLSearchParams({
    select: config.select,
    limit: String(pageSize),
    ...(orderBy
      ? { offset: String(offset), order: `${orderBy}.${orderDirection}` }
      : { offset: String(offset) }),
  });

  if (config.softDeleteField) {
    query.set(config.softDeleteField, 'eq.false');
  }

  if (search && config.searchableColumns.length > 0) {
    const normalizedSearch = search.replace(/\*/g, '').trim();
    const clauses = config.searchableColumns.map(
      (column) => `${column}.ilike.*${normalizedSearch}*`
    );
    query.set('or', `(${clauses.join(',')})`);
  }

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filter_cs.')) {
      const field = key.slice('filter_cs.'.length).trim();
      const filterValue = value.trim();
      if (field && filterValue) query.set(field, `cs.${filterValue}`);
      continue;
    }
    if (!key.startsWith('filter.')) continue;
    const field = key.slice('filter.'.length).trim();
    const filterValue = value.trim();
    if (!field || !filterValue) continue;
    query.set(field, `eq.${parseFilterValue(filterValue)}`);
  }

  const response = await pgrstTable(
    `/${config.table}?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        ...(config?.returnCountPreferDisabled ? {} : { Prefer: 'count=exact' }),
        ...getSchemaHeaders(config, 'GET'),
      },
    },
    { auth: authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  const items = mapRows(config, payload);
  const total = parseTotalFromContentRange(response.headers.get('content-range'));
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages,
  });
}

export async function createResource(resource: string, request: Request) {
  const authState = await ensureAuthenticated();
  if (authState.error) return authState.error;

  const config = getResourceConfig(resource);
  if (!config) {
    return NextResponse.json({ message: 'Recurso nao suportado.' }, { status: 404 });
  }

  const input = ((await request.json().catch(() => null)) as RecordValue | null) ?? {};
  const mappedInput = config.mapInput ? config.mapInput(input) : input;

  if (config.requiredFields?.length) {
    for (const field of config.requiredFields) {
      const value = String(mappedInput[field] ?? '').trim();
      if (!value) {
        return NextResponse.json(
          { message: `Informe o campo obrigatorio: ${field}.` },
          { status: 400 }
        );
      }
    }
  }

  const response = await pgrstTable(
    `/${config.table}?select=${encodeURIComponent(config.select)}`,
    {
      method: 'POST',
      headers: {
        ...getSchemaHeaders(config, 'POST'),
      },
      body: JSON.stringify(mappedInput),
    },
    { auth: authState.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  const [created] = mapRows(config, payload);
  return NextResponse.json(
    { message: 'Registro criado com sucesso.', item: created },
    { status: 201 }
  );
}

export async function getResourceById(resource: string, id: string) {
  const authState = await ensureAuthenticated();
  if (authState.error) return authState.error;

  const config = getResourceConfig(resource);
  if (!config) {
    return NextResponse.json({ message: 'Recurso nao suportado.' }, { status: 404 });
  }

  const query = new URLSearchParams({
    [config.primaryKey]: `eq.${id}`,
    select: config.select,
    limit: '1',
  });

  if (config.softDeleteField) {
    query.set(config.softDeleteField, 'eq.false');
  }

  const response = await pgrstTable(
    `/${config.table}?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        ...getSchemaHeaders(config, 'GET'),
      },
    },
    { auth: authState.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  const [item] = mapRows(config, payload);
  if (!item) {
    return NextResponse.json({ message: 'Registro nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function updateResource(
  resource: string,
  id: string,
  request: Request,
  options: {
    skipMapInput: boolean;
  } = {
    skipMapInput: false,
  }
) {
  const authState = await ensureAuthenticated();
  if (authState.error) return authState.error;

  const config = getResourceConfig(resource);
  if (!config) {
    return NextResponse.json({ message: 'Recurso nao suportado.' }, { status: 404 });
  }

  const input = ((await request.json().catch(() => null)) as RecordValue | null) ?? {};
  const mappedInput = !options?.skipMapInput && config.mapInput ? config.mapInput(input) : input;

  if (config.requiredFields?.length) {
    for (const field of config.requiredFields) {
      const value = String(mappedInput[field] ?? '').trim();
      if (!value) {
        return NextResponse.json(
          { message: `Informe o campo obrigatorio: ${field}.` },
          { status: 400 }
        );
      }
    }
  }

  const query = new URLSearchParams({
    [config.primaryKey]: `eq.${id}`,
    select: config.select,
  });

  const response = await pgrstTable(
    `/${config.table}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: {
        Prefer: 'return=representation',
        ...getSchemaHeaders(config, 'PATCH'),
      },
      body: JSON.stringify(mappedInput),
    },
    { auth: authState.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  const [updated] = mapRows(config, payload);
  if (!updated) {
    return NextResponse.json({ message: 'Registro nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Registro atualizado com sucesso.', item: updated });
}

export async function deleteResource(resource: string, id: string) {
  const authState = await ensureAuthenticated();
  if (authState.error) return authState.error;

  const config = getResourceConfig(resource);
  if (!config) {
    return NextResponse.json({ message: 'Recurso nao suportado.' }, { status: 404 });
  }

  const query = new URLSearchParams({
    [config.primaryKey]: `eq.${id}`,
    select: config.primaryKey,
  });

  const response = await pgrstTable(
    `/${config.table}?${query.toString()}`,
    config.softDeleteField
      ? {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation',
            ...getSchemaHeaders(config, 'PATCH'),
          },
          body: JSON.stringify({ [config.softDeleteField]: true }),
        }
      : {
          method: 'DELETE',
          headers: {
            Prefer: 'return=representation',
            ...getSchemaHeaders(config, 'DELETE'),
          },
        },
    { auth: authState.authHeader }
  );

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  const deletedRows = Array.isArray(payload) ? payload : [];
  if (deletedRows.length === 0) {
    return NextResponse.json({ message: 'Registro nao encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Registro removido com sucesso.' });
}

/**
 * Fetch resource items directly from a server component or API route,
 * bypassing the HTTP /api/resources/ layer. Auth is explicit — pass null
 * for public resources, or an auth header string for authenticated calls.
 *
 * Applies the resource config's select and mapOutput automatically.
 */
export async function serverFetchResource<T = RecordValue>(
  resource: string,
  filters: Record<string, string> = {},
  options: {
    auth?: string | null;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<T[]> {
  const config = getResourceConfig(resource);
  if (!config) throw new Error(`Resource "${resource}" not found.`);

  const query = new URLSearchParams({ select: config.select });

  for (const [field, value] of Object.entries(filters)) {
    query.set(field, `eq.${value}`);
  }

  const orderDir = options.orderDirection ?? 'asc';
  query.set('order', `${options.orderBy ?? config.defaultOrder}.${orderDir}`);

  if (options.limit != null) {
    query.set('limit', String(options.limit));
  }

  const response = await pgrstTable(
    `/${config.table}?${query.toString()}`,
    { method: 'GET', headers: getSchemaHeaders(config, 'GET') },
    { auth: options.auth ?? null }
  );

  if (!response.ok) {
    const err = parsePgError(await response.json().catch(() => null));
    throw new Error(err.message);
  }

  const payload = await response.json().catch(() => []);
  return mapRows(config, payload) as T[];
}

export function isRpcResource(resource: string) {
  return Boolean(postgrestRpcs[resource]);
}

export async function executeRpcResource(resource: string, request: Request) {
  const config = postgrestRpcs[resource];
  if (!config) {
    return NextResponse.json({ message: 'RPC nao suportada.' }, { status: 404 });
  }

  let authHeader: string | null = null;
  if (config.requiresAuth !== false) {
    const authState = await ensureAuthenticated();
    if (authState.error) return authState.error;
    authHeader = authState.authHeader;
  }

  const params = ((await request.json().catch(() => null)) ?? {}) as RecordValue;

  const response = await pgrstRpc(resource, params, {
    auth: authHeader,
    schema: config.schema,
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const err = parsePgError(payload);
    return NextResponse.json(
      { message: err.message, details: err.details },
      { status: response.status }
    );
  }

  return NextResponse.json({ items: Array.isArray(payload) ? payload : [], payload });
}
