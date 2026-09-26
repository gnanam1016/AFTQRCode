import { TestBed } from '@angular/core/testing';
import { QrCodeService } from './qr-code.service';
import { DEFAULT_CONFIG, MAX_BATCH_SIZE } from '../models/qr-code.model';

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(QrCodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Number generation (1 -> 5)', () => {
    it('should generate exact sequence [1, 2, 3, 4, 5] for range 1 to 5', () => {
      const numbers = service.generateNumbers(1, 5);
      expect(numbers).toEqual([1, 2, 3, 4, 5]);
      expect(numbers.length).toBe(5);
    });

    it('should generate single element when start equals end', () => {
      const numbers = service.generateNumbers(1001, 1001);
      expect(numbers).toEqual([1001]);
    });

    it('should return empty array if start > end', () => {
      const numbers = service.generateNumbers(10, 5);
      expect(numbers).toEqual([]);
    });

    it('should enforce MAX_BATCH_SIZE limit', () => {
      expect(() => {
        service.generateNumbers(1, MAX_BATCH_SIZE + 5);
      }).toThrowError(/Maximum supported batch size/);
    });
  });

  describe('QR DataURL Generation & Caching', () => {
    it('should generate a valid data URL for a given number', async () => {
      const dataUrl = await service.generateQrDataUrl(1001, DEFAULT_CONFIG);
      expect(dataUrl).toBeTruthy();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should generate a valid data URL for a given number with embedded data badge', async () => {
      const dataUrl = await service.generateQrDataUrl(1001, { ...DEFAULT_CONFIG, embedDataInside: true });
      expect(dataUrl).toBeTruthy();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should generate a valid data URL with embedded data disabled', async () => {
      const dataUrl = await service.generateQrDataUrl(1001, { ...DEFAULT_CONFIG, embedDataInside: false });
      expect(dataUrl).toBeTruthy();
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('should retrieve cached data URL for identical parameters', async () => {
      const url1 = await service.generateQrDataUrl(1001, DEFAULT_CONFIG);
      const url2 = await service.generateQrDataUrl(1001, DEFAULT_CONFIG);
      expect(url1).toBe(url2);
    });
  });

  describe('Batch generation', () => {
    it('should generate items with progress callbacks', async () => {
      const numbers = [101, 102, 103];
      const progressList: number[] = [];

      const items = await service.generateBatch(numbers, DEFAULT_CONFIG, (prog) => {
        progressList.push(prog.percentage);
      });

      expect(items.length).toBe(3);
      expect(items[0].value).toBe(101);
      expect(items[0].text).toBe('101');
      expect(items[0].dataUrl).toBeTruthy();
      expect(progressList.length).toBeGreaterThan(0);
      expect(progressList[progressList.length - 1]).toBe(100);
    });

    it('should prepend prefix to item text when prefix is configured', async () => {
      const numbers = [1, 2];
      const configWithPrefix = { ...DEFAULT_CONFIG, prefix: 'ITEM-' };

      const items = await service.generateBatch(numbers, configWithPrefix);

      expect(items.length).toBe(2);
      expect(items[0].value).toBe(1);
      expect(items[0].text).toBe('ITEM-1');
      expect(items[1].value).toBe(2);
      expect(items[1].text).toBe('ITEM-2');
    });

    it('should format QR text accurately with formatQrData helper', () => {
      expect(service.formatQrData(42, 'QR_')).toBe('QR_42');
      expect(service.formatQrData(42, '')).toBe('42');
      expect(service.formatQrData(42)).toBe('42');
      expect(service.formatQrData('CUSTOM', 'PRE_')).toBe('PRE_CUSTOM');
    });
  });

  describe('Color contrast checking', () => {
    it('should report high contrast for black on white', () => {
      const result = service.checkContrastRatio('#000000', '#FFFFFF');
      expect(result.sufficient).toBe(true);
      expect(result.ratio).toBeGreaterThan(15);
    });

    it('should report low contrast for light gray on white', () => {
      const result = service.checkContrastRatio('#EEEEEE', '#FFFFFF');
      expect(result.sufficient).toBe(false);
      expect(result.ratio).toBeLessThan(3.0);
    });
  });
});
