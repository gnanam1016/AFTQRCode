export const MAX_BATCH_SIZE = 10000;

export type DimensionUnit = 'px' | 'mm';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type LabelPosition = 'below' | 'above' | 'none';
export type PageSizeName = 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';

export interface QrGeneratorConfig {
  startNumber: number;
  endNumber: number;
  count: number;
  lastEditedMode: 'count' | 'range';
  prefix: string;

  width: number;
  height: number;
  widthUnit: DimensionUnit;
  heightUnit: DimensionUnit;

  qrMargin: number;
  errorCorrection: ErrorCorrectionLevel;
  foregroundColor: string;
  backgroundColor: string;
  embedDataInside: boolean;

  columns: number;
  horizontalGap: number; // in mm
  verticalGap: number;   // in mm
  labelPosition: LabelPosition;

  pageSize: PageSizeName;
  customPageWidth?: number;  // in mm
  customPageHeight?: number; // in mm
  orientation: PageOrientation;
  pageMargin: number;        // in mm
}

export const DEFAULT_CONFIG: QrGeneratorConfig = {
  startNumber: 1,
  endNumber: 10,
  count: 10,
  lastEditedMode: 'count',
  prefix: '',

  width: 100,
  height: 100,
  widthUnit: 'px',
  heightUnit: 'px',

  qrMargin: 0,
  errorCorrection: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  embedDataInside: true,

  columns: 4,
  horizontalGap: 10,
  verticalGap: 10,
  labelPosition: 'none',

  pageSize: 'A4',
  customPageWidth: 210,
  customPageHeight: 297,
  orientation: 'portrait',
  pageMargin: 10,
};

export interface QrCodeItem {
  value: number;
  text: string;
  dataUrl?: string;
  blob?: Blob;
}

export interface PageDimensionMm {
  width: number;
  height: number;
}

export const STANDARD_PAGE_SIZES_MM: Record<Exclude<PageSizeName, 'Custom'>, PageDimensionMm> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

export interface PageLayoutCalculation {
  pageWidthMm: number;
  pageHeightMm: number;
  availableWidthMm: number;
  availableHeightMm: number;
  qrWidthMm: number;
  qrHeightMm: number;
  cellWidthMm: number;
  cellHeightMm: number;
  columns: number;
  rowsPerPage: number;
  qrCodesPerPage: number;
  totalPages: number;
  fitsOnPage: boolean;
  warnings: string[];
}

export interface ExportProgress {
  status: 'idle' | 'generating' | 'pdf' | 'png' | 'zip' | 'complete' | 'error';
  current: number;
  total: number;
  percentage: number;
  message: string;
}
