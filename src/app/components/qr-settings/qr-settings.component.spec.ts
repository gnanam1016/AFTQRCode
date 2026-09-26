import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QrSettingsComponent } from './qr-settings.component';
import { DEFAULT_CONFIG } from '../../models/qr-code.model';

describe('QrSettingsComponent', () => {
  let component: QrSettingsComponent;
  let fixture: ComponentFixture<QrSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrSettingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QrSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize with default configuration', () => {
    expect(component).toBeTruthy();
    expect(component.form.get('startNumber')?.value).toBe(DEFAULT_CONFIG.startNumber);
    expect(component.form.get('endNumber')?.value).toBe(DEFAULT_CONFIG.endNumber);
    expect(component.form.get('count')?.value).toBe(DEFAULT_CONFIG.count);
    expect(component.form.get('embedDataInside')?.value).toBe(true);
  });

  describe('Bidirectional calculation', () => {
    it('Mode 1: should calculate End Number when Count is changed', () => {
      // Start = 1001, Count = 100 -> End = 1100
      component.form.patchValue({ startNumber: 1001, count: 100 });
      component.onCountChanged();

      expect(component.form.get('endNumber')?.value).toBe(1100);
      expect(component.lastCalculatedField).toBe('endNumber');
      expect(component.rangeError).toBeNull();
    });

    it('Mode 1: Start = 100, Count = 50 should produce End = 149', () => {
      component.form.patchValue({ startNumber: 100, count: 50 });
      component.onCountChanged();

      expect(component.form.get('endNumber')?.value).toBe(149);
    });

    it('Mode 2: should calculate Count when End Number is changed', () => {
      // Start = 100, End = 199 -> Count = 100
      component.form.patchValue({ startNumber: 100, endNumber: 199 });
      component.onEndNumberChanged();

      expect(component.form.get('count')?.value).toBe(100);
      expect(component.lastCalculatedField).toBe('count');
      expect(component.rangeError).toBeNull();
    });

    it('should adjust End Number when Start Number is changed in Mode 1', () => {
      // Current mode is 'endNumber' (count is preserved)
      component.lastCalculatedField = 'endNumber';
      component.form.patchValue({ startNumber: 200, count: 25 });
      component.onStartNumberChanged();

      expect(component.form.get('endNumber')?.value).toBe(224);
    });
  });

  describe('Range and Input Validation', () => {
    it('should show error when Start Number > End Number', () => {
      component.form.patchValue({ startNumber: 500, endNumber: 100 });
      component.validateRange();

      expect(component.rangeError).toBe('Start number must be less than or equal to end number.');
    });

    it('should show error when Count <= 0', () => {
      component.form.patchValue({ startNumber: 10, endNumber: 10, count: 0 });
      component.validateRange();

      expect(component.rangeError).toBe('Number of QR codes must be greater than 0.');
    });

    it('should reject negative values', () => {
      component.form.patchValue({ startNumber: -5, endNumber: 10, count: 16 });
      component.validateRange();

      expect(component.rangeError).toBe('Negative numbers are not allowed.');
    });

    it('should reject decimal numbers', () => {
      component.form.patchValue({ startNumber: 1.5, endNumber: 10, count: 9 });
      component.validateRange();

      expect(component.rangeError).toBe('Only whole integer numbers are supported.');
    });

    it('should reject counts larger than MAX_BATCH_SIZE (10,000)', () => {
      component.form.patchValue({ startNumber: 1, endNumber: 15000, count: 15000 });
      component.validateRange();

      expect(component.rangeError).toContain('Maximum supported batch size is 10,000');
    });
  });

  describe('Reset functionality', () => {
    it('should reset form values to defaults', () => {
      component.form.patchValue({ startNumber: 500, count: 50 });
      let resetEmitted = false;
      component.resetRequested.subscribe(() => {
        resetEmitted = true;
      });

      component.onReset();

      expect(resetEmitted).toBe(true);
      expect(component.form.get('startNumber')?.value).toBe(DEFAULT_CONFIG.startNumber);
      expect(component.form.get('endNumber')?.value).toBe(DEFAULT_CONFIG.endNumber);
      expect(component.form.get('count')?.value).toBe(DEFAULT_CONFIG.count);
    });
  });
});
