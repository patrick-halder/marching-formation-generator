/**
 * Marschaufstellung-Generator — Export Module
 * Handles PDF, PNG, and clipboard export of formations.
 */

import { REGISTER_COLORS } from './state.js';

// ─── Error Class ─────────────────────────────────────────────────────────────

/**
 * Custom error class for export-related failures.
 */
export class ExportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExportError';
  }
}

// ─── Public Functions ────────────────────────────────────────────────────────

/**
 * Konvertiert eine Formation in eine Tab-delimited Text-Repräsentation.
 * @param {FormationResult} formation
 * @returns {string} Tab-separierter Text
 */
export function formationToText(formation) {
  const { grid } = formation;
  const lines = grid.map((row) => {
    return row
      .map((cell) => {
        if (cell.register !== null && cell.register !== undefined) {
          const info = REGISTER_COLORS[cell.register];
          return info ? info.abbreviation : '';
        }
        return '';
      })
      .join('\t');
  });
  return lines.join('\n');
}

/**
 * Kopiert die Formation als tabulatorgetrennten Text in die Zwischenablage.
 * @param {FormationResult} formation - Die aktuelle Formation
 * @returns {Promise<void>}
 * @throws {ExportError} Bei Clipboard-Fehlern
 */
export async function copyToClipboard(formation) {
  try {
    const text = formationToText(formation);
    await navigator.clipboard.writeText(text);
  } catch (err) {
    throw new ExportError('Kopieren in die Zwischenablage fehlgeschlagen.');
  }
}

/**
 * Exportiert die Formation als PNG-Bild.
 * @param {HTMLElement} gridElement - Das gerenderte Grid-Element
 * @returns {Promise<void>} Triggers download
 * @throws {ExportError} Bei Rendering-Fehlern
 */
export async function exportAsPng(gridElement) {
  try {
    const html2canvas = window.html2canvas;
    const canvas = await html2canvas(gridElement, {
      scale: 2,
      backgroundColor: '#1a1a2e',
    });

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas to blob conversion failed'));
      }, 'image/png');
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'marschaufstellung.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    throw new ExportError('PNG-Export fehlgeschlagen. Bitte erneut versuchen.');
  }
}

/**
 * Exportiert die Formation als PDF-Dokument (A4, Querformat).
 * @param {FormationResult} formation - Die aktuelle Formation
 * @param {ExportMetadata} metadata - Variante, Besetzung etc.
 * @returns {Promise<void>} Triggers download
 * @throws {ExportError} Bei Rendering-Fehlern
 */
export async function exportAsPdf(formation, metadata) {
  try {
    const html2canvas = window.html2canvas;
    const { jsPDF } = window.jspdf;

    // Capture the formation display element
    const displayEl = document.getElementById('formation-display');
    const canvas = await html2canvas(displayEl, {
      scale: 2,
      backgroundColor: '#1a1a2e',
    });

    // Create landscape A4 PDF
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add title
    pdf.setFontSize(18);
    pdf.text('Marschaufstellung-Generator', 14, 15);

    // Add metadata
    pdf.setFontSize(10);
    const variantLabel = metadata.variant === 'variante1'
      ? 'Variante 1 — Traditionell'
      : 'Variante 2 — Melodie / Schlagzeug / Harmonie';
    pdf.text(`Variante: ${variantLabel}`, 14, 24);
    pdf.text(`Datum: ${metadata.generatedAt.toLocaleDateString('de-DE')}`, 14, 30);

    // Build register counts summary
    const countEntries = Object.entries(metadata.counts)
      .filter(([, count]) => count > 0)
      .map(([register, count]) => {
        const info = REGISTER_COLORS[register];
        return `${info ? info.label : register}: ${count}`;
      });
    if (countEntries.length > 0) {
      pdf.text(`Besetzung: ${countEntries.join(', ')}`, 14, 36);
    }

    // Add the canvas image scaled to fit page
    const imgData = canvas.toDataURL('image/png');
    const marginTop = 42;
    const marginSide = 14;
    const availableWidth = pageWidth - marginSide * 2;
    const availableHeight = pageHeight - marginTop - 10;

    const imgAspect = canvas.width / canvas.height;
    let imgWidth = availableWidth;
    let imgHeight = imgWidth / imgAspect;

    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight * imgAspect;
    }

    pdf.addImage(imgData, 'PNG', marginSide, marginTop, imgWidth, imgHeight);

    // Download
    pdf.save('marschaufstellung.pdf');
  } catch (err) {
    throw new ExportError('PDF-Export fehlgeschlagen. Bitte erneut versuchen.');
  }
}
