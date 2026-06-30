import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildRequestPayload, requestFormation, ApiError, API_ENDPOINT } from '../public/js/api-client.js';

describe('ApiError', () => {
  it('has correct name, message, and type', () => {
    const error = new ApiError('Test message', 'timeout');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Test message');
    expect(error.type).toBe('timeout');
  });

  it('supports all error types', () => {
    for (const type of ['timeout', 'http', 'network', 'parse']) {
      const error = new ApiError('msg', type);
      expect(error.type).toBe(type);
    }
  });
});

describe('API_ENDPOINT', () => {
  it('has a default value', () => {
    expect(API_ENDPOINT).toBe('/api/formation');
  });
});

describe('buildRequestPayload', () => {
  it('constructs a complete payload from state', () => {
    const state = {
      counts: {
        posaunen: 3,
        klarinetten: 5,
        fluegelhoerner: 2,
        hoerner: 4,
        saxophone: 3,
        trompeten: 6,
        floeten: 4,
        tenorhorn_bariton: 2,
        tuben: 3,
        schlagzeug: 4,
      },
      schlagzeugCounts: {
        kleineTrommel: 2,
        becken: 1,
        grosseTrommel: 1,
      },
      variant: 'variante1',
    };

    const payload = buildRequestPayload(state);

    expect(payload.registerCounts).toEqual(state.counts);
    expect(payload.schlagzeugCounts).toEqual(state.schlagzeugCounts);
    expect(payload.variant).toBe('variante1');
    expect(payload.gridDimensions).toEqual({ rows: 6, columns: 6 });
    expect(payload.constraints).toHaveLength(7);
    expect(payload.constraints[0].priority).toBe(1);
    expect(payload.constraints[6].priority).toBe(7);
  });

  it('constraints are sorted by priority ascending', () => {
    const state = {
      counts: { posaunen: 1, klarinetten: 0, fluegelhoerner: 0, hoerner: 0, saxophone: 0, trompeten: 0, floeten: 0, tenorhorn_bariton: 0, tuben: 0, schlagzeug: 0 },
      schlagzeugCounts: { kleineTrommel: 0, becken: 0, grosseTrommel: 0 },
      variant: 'variante2',
    };

    const payload = buildRequestPayload(state);

    for (let i = 0; i < payload.constraints.length - 1; i++) {
      expect(payload.constraints[i].priority).toBeLessThan(payload.constraints[i + 1].priority);
    }
  });

  it('computes grid dimensions from total count', () => {
    const state = {
      counts: { posaunen: 5, klarinetten: 5, fluegelhoerner: 0, hoerner: 0, saxophone: 0, trompeten: 0, floeten: 0, tenorhorn_bariton: 0, tuben: 0, schlagzeug: 0 },
      schlagzeugCounts: { kleineTrommel: 0, becken: 0, grosseTrommel: 0 },
      variant: 'variante1',
    };

    const payload = buildRequestPayload(state);
    // 10 players: columns = round(sqrt(10)) = 3, rows = ceil(10/3) = 4
    expect(payload.gridDimensions).toEqual({ rows: 4, columns: 3 });
  });

  it('does not mutate the original state', () => {
    const state = {
      counts: { posaunen: 1, klarinetten: 0, fluegelhoerner: 0, hoerner: 0, saxophone: 0, trompeten: 0, floeten: 0, tenorhorn_bariton: 0, tuben: 0, schlagzeug: 0 },
      schlagzeugCounts: { kleineTrommel: 0, becken: 0, grosseTrommel: 0 },
      variant: 'variante1',
    };

    const original = JSON.parse(JSON.stringify(state));
    buildRequestPayload(state);
    expect(state).toEqual(original);
  });
});

describe('requestFormation', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const samplePayload = {
    registerCounts: { posaunen: 3 },
    schlagzeugCounts: { kleineTrommel: 1, becken: 0, grosseTrommel: 0 },
    variant: 'variante1',
    gridDimensions: { rows: 2, columns: 2 },
    constraints: [],
  };

  it('sends POST request with correct headers and body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ positions: [], violations: [] }),
    });

    await requestFormation(samplePayload);

    expect(fetchMock).toHaveBeenCalledWith(
      API_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(samplePayload),
      })
    );
  });

  it('returns parsed JSON on success', async () => {
    const responseData = { positions: [{ row: 0, column: 0, register: 'posaunen' }], violations: [] };
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseData),
    });

    const result = await requestFormation(samplePayload);
    expect(result).toEqual(responseData);
  });

  it('throws ApiError with type "http" on non-2xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(requestFormation(samplePayload)).rejects.toThrow(ApiError);
    try {
      await requestFormation(samplePayload);
    } catch (err) {
      expect(err.type).toBe('http');
      expect(err.message).toBe('Serverfehler: 500 Internal Server Error');
    }
  });

  it('throws ApiError with type "parse" on malformed JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    await expect(requestFormation(samplePayload)).rejects.toThrow(ApiError);
    try {
      await requestFormation(samplePayload);
    } catch (err) {
      expect(err.type).toBe('parse');
      expect(err.message).toBe('Ungültige Antwort vom Server.');
    }
  });

  it('throws ApiError with type "network" on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(requestFormation(samplePayload)).rejects.toThrow(ApiError);
    try {
      await requestFormation(samplePayload);
    } catch (err) {
      expect(err.type).toBe('network');
      expect(err.message).toBe('Netzwerkfehler: Keine Verbindung zum Server.');
    }
  });

  it('throws ApiError with type "timeout" on AbortError', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }));

    await expect(requestFormation(samplePayload)).rejects.toThrow(ApiError);
    try {
      await requestFormation(samplePayload);
    } catch (err) {
      expect(err.type).toBe('timeout');
      expect(err.message).toBe('Die Anfrage hat das Zeitlimit überschritten. Bitte erneut versuchen.');
    }
  });

  it('throws ApiError with type "timeout" when external signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      requestFormation(samplePayload, { signal: controller.signal })
    ).rejects.toThrow(ApiError);

    try {
      const ctrl2 = new AbortController();
      ctrl2.abort();
      await requestFormation(samplePayload, { signal: ctrl2.signal });
    } catch (err) {
      expect(err.type).toBe('timeout');
    }
  });

  it('uses configurable timeout', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementation(() => new Promise(() => {})); // never resolves

    const promise = requestFormation(samplePayload, { timeoutMs: 5000 });

    // Advance timer past the timeout
    vi.advanceTimersByTime(5001);

    await expect(promise).rejects.toThrow(ApiError);
    try {
      fetchMock.mockImplementation(() => new Promise(() => {}));
      const p2 = requestFormation(samplePayload, { timeoutMs: 5000 });
      vi.advanceTimersByTime(5001);
      await p2;
    } catch (err) {
      expect(err.type).toBe('timeout');
    }

    vi.useRealTimers();
  });
});
