import { TestBed } from '@angular/core/testing';
import { LayoutCalcService, mmToPx, pxToMm } from './layout-calc.service';
import { DEFAULT_CONFIG, QrGeneratorConfig } from '../models/qr-code.model';

describe('LayoutCalcService', () => {
  let service: LayoutCalcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LayoutCalcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Unit conversions', () => {
    it('should convert 96px to 25.4mm (1 inch)', () => {
      expect(pxToMm(96)).toBeCloseTo(25.4, 2);
    });

    it('should convert 25.4mm to 96px (1 inch)', () => {
      expect(mmToPx(25.4)).toBeCloseTo(96, 2);
    });

    it('should handle toMm helper correctly for px and mm', () => {
      expect(service.toMm(50, 'mm')).toBe(50);
      expect(service.toMm(96, 'px')).toBeCloseTo(25.4, 2);
    });
  });

  describe('Page calculations and layout estimation', () => {
    it('should calculate A4 portrait dimensions and margins accurately', () => {
      const config: QrGeneratorConfig = {
        ...DEFAULT_CONFIG,
        pageSize: 'A4',
        orientation: 'portrait',
        pageMargin: 10,
        count: 100,
        columns: 4,
      };

      const result = service.calculatePages(config);
      expect(result.pageWidthMm).toBe(210);
      expect(result.pageHeightMm).toBe(297);
      expect(result.availableWidthMm).toBe(190);
      expect(result.availableHeightMm).toBe(277);
      expect(result.columns).toBe(4);
      expect(result.totalPages).toBeGreaterThan(0);
      expect(result.qrCodesPerPage).toBe(result.columns * result.rowsPerPage);
    });

    it('should swap width and height for landscape orientation', () => {
      const config: QrGeneratorConfig = {
        ...DEFAULT_CONFIG,
        pageSize: 'A4',
        orientation: 'landscape',
        pageMargin: 10,
      };

      const result = service.calculatePages(config);
      expect(result.pageWidthMm).toBe(297);
      expect(result.pageHeightMm).toBe(210);
    });

    it('should support A3, Letter, and Legal standard sizes', () => {
      const a3 = service.calculatePages({ ...DEFAULT_CONFIG, pageSize: 'A3', orientation: 'portrait' });
      expect(a3.pageWidthMm).toBe(297);
      expect(a3.pageHeightMm).toBe(420);

      const letter = service.calculatePages({ ...DEFAULT_CONFIG, pageSize: 'Letter', orientation: 'portrait' });
      expect(letter.pageWidthMm).toBeCloseTo(215.9, 1);
      expect(letter.pageHeightMm).toBeCloseTo(279.4, 1);

      const legal = service.calculatePages({ ...DEFAULT_CONFIG, pageSize: 'Legal', orientation: 'portrait' });
      expect(legal.pageWidthMm).toBeCloseTo(215.9, 1);
      expect(legal.pageHeightMm).toBeCloseTo(355.6, 1);
    });

    it('should support Custom page size dimensions', () => {
      const custom = service.calculatePages({
        ...DEFAULT_CONFIG,
        pageSize: 'Custom',
        customPageWidth: 150,
        customPageHeight: 200,
        orientation: 'portrait',
      });
      expect(custom.pageWidthMm).toBe(150);
      expect(custom.pageHeightMm).toBe(200);
    });

    it('should generate a warning when columns exceed printable width', () => {
      const config: QrGeneratorConfig = {
        ...DEFAULT_CONFIG,
        width: 100,
        widthUnit: 'mm',
        columns: 4, // 4 * 100mm + gaps = >400mm, larger than A4 width of 210mm
        pageSize: 'A4',
        orientation: 'portrait',
      };

      const result = service.calculatePages(config);
      expect(result.fitsOnPage).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('exceeds printable width');
    });

    it('should calculate 0 total pages when count is 0', () => {
      const config: QrGeneratorConfig = {
        ...DEFAULT_CONFIG,
        count: 0,
      };
      const result = service.calculatePages(config);
      expect(result.totalPages).toBe(0);
    });
  });
});
