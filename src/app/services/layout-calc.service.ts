import { Injectable } from '@angular/core';
import {
  PageLayoutCalculation,
  QrGeneratorConfig,
  STANDARD_PAGE_SIZES_MM,
} from '../models/qr-code.model';

export const MM_PER_INCH = 25.4;
export const STANDARD_DPI = 96;

export function pxToMm(px: number): number {
  return (px * MM_PER_INCH) / STANDARD_DPI;
}

export function mmToPx(mm: number): number {
  return (mm * STANDARD_DPI) / MM_PER_INCH;
}

@Injectable({
  providedIn: 'root',
})
export class LayoutCalcService {
  /**
   * Estimates label height in mm based on font size and spacing
   */
  readonly LABEL_HEIGHT_MM = 6;
  readonly LABEL_GAP_MM = 2;

  /**
   * Converts any dimension to mm based on its unit
   */
  toMm(value: number, unit: 'px' | 'mm'): number {
    return unit === 'px' ? pxToMm(value) : value;
  }

  /**
   * Calculates page dimensions, grid layout, rows, and total pages
   */
  calculatePages(config: QrGeneratorConfig): PageLayoutCalculation {
    // 1. Determine raw page dimensions in mm
    let rawWidth: number;
    let rawHeight: number;

    if (config.pageSize === 'Custom') {
      rawWidth = config.customPageWidth || 210;
      rawHeight = config.customPageHeight || 297;
    } else {
      const standard = STANDARD_PAGE_SIZES_MM[config.pageSize] || STANDARD_PAGE_SIZES_MM.A4;
      rawWidth = standard.width;
      rawHeight = standard.height;
    }

    // 2. Adjust for orientation
    let pageWidthMm = rawWidth;
    let pageHeightMm = rawHeight;
    if (config.orientation === 'landscape') {
      pageWidthMm = Math.max(rawWidth, rawHeight);
      pageHeightMm = Math.min(rawWidth, rawHeight);
    } else {
      pageWidthMm = Math.min(rawWidth, rawHeight);
      pageHeightMm = Math.max(rawWidth, rawHeight);
    }

    // 3. Printable area
    const margin = Math.max(0, config.pageMargin || 0);
    const availableWidthMm = Math.max(0, pageWidthMm - 2 * margin);
    const availableHeightMm = Math.max(0, pageHeightMm - 2 * margin);

    // 4. QR and Cell dimensions in mm
    const qrWidthMm = Math.max(1, this.toMm(config.width, config.widthUnit));
    const qrHeightMm = Math.max(1, this.toMm(config.height, config.heightUnit));

    const extraLabelHeight =
      config.labelPosition !== 'none' ? this.LABEL_HEIGHT_MM + this.LABEL_GAP_MM : 0;
    const cellWidthMm = qrWidthMm;
    const cellHeightMm = qrHeightMm + extraLabelHeight;

    const columns = Math.max(1, Math.floor(config.columns || 1));
    const horizontalGap = Math.max(0, config.horizontalGap || 0);
    const verticalGap = Math.max(0, config.verticalGap || 0);

    const warnings: string[] = [];

    // 5. Width check
    const requiredRowWidthMm = columns * cellWidthMm + (columns - 1) * horizontalGap;
    if (requiredRowWidthMm > availableWidthMm) {
      warnings.push(
        `Total row width (${requiredRowWidthMm.toFixed(1)} mm) exceeds printable width (${availableWidthMm.toFixed(1)} mm) for ${columns} columns.`
      );
    }

    // 6. Height check & Rows per page calculation
    let rowsPerPage = 0;
    if (cellHeightMm > availableHeightMm) {
      warnings.push(
        `Item height (${cellHeightMm.toFixed(1)} mm) exceeds printable page height (${availableHeightMm.toFixed(1)} mm).`
      );
      rowsPerPage = 1; // Fallback so we don't divide by zero
    } else {
      // (rows * cellHeightMm) + (rows - 1) * verticalGap <= availableHeightMm
      // rows * (cellHeightMm + verticalGap) - verticalGap <= availableHeightMm
      rowsPerPage = Math.floor((availableHeightMm + verticalGap) / (cellHeightMm + verticalGap));
      rowsPerPage = Math.max(1, rowsPerPage);
    }

    const qrCodesPerPage = columns * rowsPerPage;
    const totalQrCodes = Math.max(0, config.count || 0);
    const totalPages = totalQrCodes > 0 ? Math.ceil(totalQrCodes / qrCodesPerPage) : 0;

    const fitsOnPage = warnings.length === 0;

    return {
      pageWidthMm,
      pageHeightMm,
      availableWidthMm,
      availableHeightMm,
      qrWidthMm,
      qrHeightMm,
      cellWidthMm,
      cellHeightMm,
      columns,
      rowsPerPage,
      qrCodesPerPage,
      totalPages,
      fitsOnPage,
      warnings,
    };
  }
}
