import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formationToText, copyToClipboard, exportAsPng, exportAsPdf, ExportError } from '../public/js/export.js';

// ─── Helper: Build a FormationResult with a grid ─────────────────────────────

function makeFormation(gridData) {
  const grid = gridData.map((row, rowIdx) =>
    row.map((register, colIdx) => ({
      row: rowIdx,
      column: colIdx,
      register,
      subInstrument: null,
    }))
  );
  return {
    dimensions: { rows: grid.length, columns: grid[0]?.length ?? 0 },
    grid,
    violatedConstraints: [],
  };
}

// ─── formationToText ─────────────────────────────────────────────────────────

describe('export.js — formationToText', () => {
  it('converts a simple 2x2 grid to tab-separated text', () => {
    const formation = makeFormation([
      ['posaunen', 'klarinetten'],
      ['tuben', null],
    ]);
    const text = formationToText(formation);
    expect(text).toBe('Pos\tKl\nTu\t');
  });

  it('handles an entirely empty grid', () => {
    const formation = makeFormation([
      [null, null],
      [null, null],
    ]);
    const text = formationToText(formation);
    expect(text).toBe('\t\n\t');
  });

  it('handles a single cell with a register', () => {
    const formation = makeFormation([['schlagzeug']]);
    const text = formationToText(formation);
    expect(text).toBe('Sz');
  });

  it('handles a single empty cell', () => {
    const formation = makeFormation([[null]]);
    const text = formationToText(formation);
    expect(text).toBe('');
  });

  it('uses correct abbreviations for all registers', () => {
    const formation = makeFormation([
      ['posaunen', 'klarinetten', 'fluegelhoerner', 'hoerner', 'saxophone'],
      ['trompeten', 'floeten', 'tenorhorn_bariton', 'tuben', 'schlagzeug'],
    ]);
    const text = formationToText(formation);
    const lines = text.split('\n');
    expect(lines[0]).toBe('Pos\tKl\tFlgh\tHn\tSax');
    expect(lines[1]).toBe('Tr\tFl\tThB\tTu\tSz');
  });

  it('produces correct number of tabs per line (columns - 1)', () => {
    const formation = makeFormation([
      ['posaunen', null, 'tuben'],
      [null, 'klarinetten', null],
    ]);
    const text = formationToText(formation);
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      const tabs = (line.match(/\t/g) || []).length;
      expect(tabs).toBe(2); // 3 columns → 2 tabs
    }
  });
});

// ─── copyToClipboard ─────────────────────────────────────────────────────────

describe('export.js — copyToClipboard', () => {
  let writeTextMock;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
  });

  it('writes formatted text to clipboard', async () => {
    const formation = makeFormation([['posaunen', 'tuben']]);
    await copyToClipboard(formation);
    expect(writeTextMock).toHaveBeenCalledWith('Pos\tTu');
  });

  it('throws ExportError with German message when clipboard fails', async () => {
    writeTextMock.mockRejectedValue(new Error('denied'));
    const formation = makeFormation([['posaunen']]);
    await expect(copyToClipboard(formation)).rejects.toThrow(ExportError);
    await expect(copyToClipboard(formation)).rejects.toThrow(
      'Kopieren in die Zwischenablage fehlgeschlagen.'
    );
  });
});

// ─── exportAsPng ─────────────────────────────────────────────────────────────

describe('export.js — exportAsPng', () => {
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = {
      toBlob: vi.fn((cb) => cb(new Blob(['png'], { type: 'image/png' }))),
    };
    window.html2canvas = vi.fn().mockResolvedValue(mockCanvas);

    // Mock URL object methods
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls html2canvas with correct options', async () => {
    const el = document.createElement('div');
    await exportAsPng(el);
    expect(window.html2canvas).toHaveBeenCalledWith(el, {
      scale: 2,
      backgroundColor: '#1a1a2e',
    });
  });

  it('throws ExportError with German message on failure', async () => {
    window.html2canvas = vi.fn().mockRejectedValue(new Error('render fail'));
    const el = document.createElement('div');
    await expect(exportAsPng(el)).rejects.toThrow(ExportError);
    await expect(exportAsPng(el)).rejects.toThrow(
      'PNG-Export fehlgeschlagen. Bitte erneut versuchen.'
    );
  });
});

// ─── exportAsPdf ─────────────────────────────────────────────────────────────

describe('export.js — exportAsPdf', () => {
  let mockPdf;
  let mockCanvas;

  beforeEach(() => {
    mockCanvas = {
      toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
      width: 800,
      height: 400,
    };
    window.html2canvas = vi.fn().mockResolvedValue(mockCanvas);

    mockPdf = {
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
      setFontSize: vi.fn(),
      text: vi.fn(),
      addImage: vi.fn(),
      save: vi.fn(),
    };
    window.jspdf = { jsPDF: vi.fn(() => mockPdf) };

    // Provide a formation-display element in DOM
    const displayEl = document.createElement('div');
    displayEl.id = 'formation-display';
    document.body.appendChild(displayEl);
  });

  afterEach(() => {
    const el = document.getElementById('formation-display');
    if (el) el.remove();
    vi.restoreAllMocks();
  });

  it('creates a landscape A4 PDF and saves it', async () => {
    const formation = makeFormation([['posaunen']]);
    const metadata = {
      variant: 'variante1',
      counts: { posaunen: 4, klarinetten: 0, fluegelhoerner: 0, hoerner: 0, saxophone: 0, trompeten: 0, floeten: 0, tenorhorn_bariton: 0, tuben: 0, schlagzeug: 0 },
      generatedAt: new Date('2024-06-15'),
    };

    await exportAsPdf(formation, metadata);

    expect(window.jspdf.jsPDF).toHaveBeenCalledWith('l', 'mm', 'a4');
    expect(mockPdf.text).toHaveBeenCalledWith('Marschaufstellung-Generator', 14, 15);
    expect(mockPdf.save).toHaveBeenCalledWith('marschaufstellung.pdf');
  });

  it('throws ExportError with German message on failure', async () => {
    window.html2canvas = vi.fn().mockRejectedValue(new Error('fail'));
    const formation = makeFormation([['posaunen']]);
    const metadata = {
      variant: 'variante2',
      counts: { posaunen: 1, klarinetten: 0, fluegelhoerner: 0, hoerner: 0, saxophone: 0, trompeten: 0, floeten: 0, tenorhorn_bariton: 0, tuben: 0, schlagzeug: 0 },
      generatedAt: new Date(),
    };

    await expect(exportAsPdf(formation, metadata)).rejects.toThrow(ExportError);
    await expect(exportAsPdf(formation, metadata)).rejects.toThrow(
      'PDF-Export fehlgeschlagen. Bitte erneut versuchen.'
    );
  });
});
