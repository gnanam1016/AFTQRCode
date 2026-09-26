import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  DEFAULT_CONFIG,
  DimensionUnit,
  ErrorCorrectionLevel,
  LabelPosition,
  MAX_BATCH_SIZE,
  PageOrientation,
  PageSizeName,
  QrGeneratorConfig,
} from '../../models/qr-code.model';
import { QrCodeService } from '../../services/qr-code.service';

@Component({
  selector: 'app-qr-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="settings-card">
      <form [formGroup]="form" (ngSubmit)="onGenerate()">
        
        <!-- SECTION 1: QR CODE RANGE -->
        <div class="settings-section">
          <div class="section-header">
            <span class="step-num">1</span>
            <div>
              <h2 class="section-title">QR Code Range</h2>
              <p class="section-desc">Specify numbers manually or by total count</p>
            </div>
          </div>

          <div class="range-grid">
            <!-- Mode 1: Number of QR Codes -->
            <div class="form-group">
              <label for="countInput" class="label-with-badge">
                <span>Number of QR Codes</span>
                <span class="calc-badge" *ngIf="lastCalculatedField === 'count'">Auto-calculated</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="countInput"
                  type="number"
                  formControlName="count"
                  class="form-control"
                  [class.is-invalid]="form.get('count')?.invalid && form.get('count')?.touched"
                  placeholder="e.g. 100"
                  min="1"
                  [max]="maxBatchSize"
                  step="1"
                  (input)="onCountChanged()"
                />
              </div>
            </div>

            <!-- Start Number -->
            <div class="form-group">
              <label for="startNumberInput">Start Number</label>
              <div class="input-wrapper">
                <input
                  id="startNumberInput"
                  type="number"
                  formControlName="startNumber"
                  class="form-control"
                  [class.is-invalid]="form.get('startNumber')?.invalid && form.get('startNumber')?.touched"
                  placeholder="e.g. 1001"
                  step="1"
                  (input)="onStartNumberChanged()"
                />
              </div>
            </div>

            <!-- End Number -->
            <div class="form-group">
              <label for="endNumberInput" class="label-with-badge">
                <span>End Number</span>
                <span class="calc-badge" *ngIf="lastCalculatedField === 'endNumber'">Auto-calculated</span>
              </label>
              <div class="input-wrapper">
                <input
                  id="endNumberInput"
                  type="number"
                  formControlName="endNumber"
                  class="form-control"
                  [class.is-invalid]="form.get('endNumber')?.invalid && form.get('endNumber')?.touched"
                  placeholder="e.g. 1100"
                  step="1"
                  (input)="onEndNumberChanged()"
                />
              </div>
            </div>
          </div>

          <!-- Data Prefix Option -->
          <div class="form-group prefix-group">
            <label for="prefixInput" class="label-with-badge">
              <span>Data Prefix (Optional)</span>
              <span class="preview-badge" *ngIf="form.get('prefix')?.value">
                Preview: {{ form.get('prefix')?.value }}{{ form.get('startNumber')?.value }} – {{ form.get('prefix')?.value }}{{ form.get('endNumber')?.value }}
              </span>
            </label>
            <div class="input-wrapper">
              <input
                id="prefixInput"
                type="text"
                formControlName="prefix"
                class="form-control prefix-control"
                placeholder="e.g. ITEM-, QR-, https://example.com/id="
                maxlength="100"
              />
            </div>
            <span class="field-hint">
              Prepends a prefix to each QR code's encoded data (e.g.
              <code>{{ (form.get('prefix')?.value || 'ITEM-') + (form.get('startNumber')?.value ?? 1) }}</code>
              to
              <code>{{ (form.get('prefix')?.value || 'ITEM-') + (form.get('endNumber')?.value ?? 10) }}</code>)
            </span>
          </div>

          <!-- Range Validation Alerts -->
          <div class="alert alert-danger" *ngIf="rangeError">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ rangeError }}</span>
          </div>
        </div>

        <hr class="section-divider" />

        <!-- SECTION 2: QR CODE APPEARANCE SETTINGS -->
        <div class="settings-section">
          <div class="section-header">
            <span class="step-num">2</span>
            <div>
              <h2 class="section-title">QR Code Settings</h2>
              <p class="section-desc">Customize size, margins, colors, and error correction</p>
            </div>
          </div>

          <div class="form-grid-2">
            <!-- Width -->
            <div class="form-group">
              <label for="widthInput">Width</label>
              <div class="input-group">
                <input
                  id="widthInput"
                  type="number"
                  formControlName="width"
                  class="form-control"
                  min="10"
                  max="2000"
                  step="1"
                />
                <select formControlName="widthUnit" class="form-select unit-select" aria-label="Width Unit">
                  <option value="px">px</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>

            <!-- Height -->
            <div class="form-group">
              <label for="heightInput">Height</label>
              <div class="input-group">
                <input
                  id="heightInput"
                  type="number"
                  formControlName="height"
                  class="form-control"
                  min="10"
                  max="2000"
                  step="1"
                />
                <select formControlName="heightUnit" class="form-select unit-select" aria-label="Height Unit">
                  <option value="px">px</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            </div>

            <!-- QR Code Margin -->
            <div class="form-group">
              <label for="marginInput">QR Code Margin</label>
              <input
                id="marginInput"
                type="number"
                formControlName="qrMargin"
                class="form-control"
                min="0"
                max="20"
                step="1"
              />
            </div>

            <!-- Error Correction Level -->
            <div class="form-group">
              <label for="ecSelect">Error Correction Level</label>
              <select id="ecSelect" formControlName="errorCorrection" class="form-select">
                <option value="L">Low (L) - 7% recovery</option>
                <option value="M">Medium (M) - 15% recovery</option>
                <option value="Q">Quartile (Q) - 25% recovery</option>
                <option value="H">High (H) - 30% recovery</option>
              </select>
            </div>

            <!-- QR Code Color (Foreground) -->
            <div class="form-group">
              <label for="fgColor">Foreground Color</label>
              <div class="color-picker-wrapper">
                <input
                  id="fgColor"
                  type="color"
                  formControlName="foregroundColor"
                  class="color-input"
                  (change)="checkContrast()"
                />
                <span class="color-value">{{ form.get('foregroundColor')?.value }}</span>
              </div>
            </div>

            <!-- Background Color -->
            <div class="form-group">
              <label for="bgColor">Background Color</label>
              <div class="color-picker-wrapper">
                <input
                  id="bgColor"
                  type="color"
                  formControlName="backgroundColor"
                  class="color-input"
                  (change)="checkContrast()"
                />
                <span class="color-value">{{ form.get('backgroundColor')?.value }}</span>
              </div>
            </div>
          </div>

          <!-- Embed Data Inside QR Code (Center Text Badge) -->
          <div class="toggle-wrapper">
            <label class="toggle-container" [class.active]="form.get('embedDataInside')?.value" for="embedDataInsideInput">
              <input
                id="embedDataInsideInput"
                type="checkbox"
                formControlName="embedDataInside"
                class="toggle-checkbox"
              />
              <span class="toggle-label">
                <span class="toggle-title">Embed Data Inside QR Code (Center Badge)</span>
                <span class="toggle-desc">Renders the unique number in the center of the QR code so users can read the data directly from the image itself</span>
              </span>
            </label>
          </div>

          <!-- Contrast Warning -->
          <div class="alert alert-warning" *ngIf="contrastWarning">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>Low contrast between QR code and background may reduce scanner readability.</span>
          </div>
        </div>

        <hr class="section-divider" />

        <!-- SECTION 3: PDF / PRINT LAYOUT -->
        <div class="settings-section">
          <div class="section-header">
            <span class="step-num">3</span>
            <div>
              <h2 class="section-title">PDF / Print Layout</h2>
              <p class="section-desc">Arrangement of QR codes on exported pages</p>
            </div>
          </div>

          <div class="form-grid-2">
            <!-- QR Codes Per Row -->
            <div class="form-group">
              <label for="columnsInput">QR Codes Per Row (Columns)</label>
              <input
                id="columnsInput"
                type="number"
                formControlName="columns"
                class="form-control"
                min="1"
                max="12"
                step="1"
              />
            </div>

            <!-- Outside Label Position -->
            <div class="form-group">
              <label for="labelPositionSelect">Outside Label</label>
              <select id="labelPositionSelect" formControlName="labelPosition" class="form-select">
                <option value="none">No Outside Label (Data Inside QR)</option>
                <option value="below">Below QR Code</option>
                <option value="above">Above QR Code</option>
              </select>
            </div>

            <!-- Horizontal Gap -->
            <div class="form-group">
              <label for="hGapInput">Horizontal Gap (mm)</label>
              <input
                id="hGapInput"
                type="number"
                formControlName="horizontalGap"
                class="form-control"
                min="0"
                max="100"
                step="1"
              />
            </div>

            <!-- Vertical Gap -->
            <div class="form-group">
              <label for="vGapInput">Vertical Gap (mm)</label>
              <input
                id="vGapInput"
                type="number"
                formControlName="verticalGap"
                class="form-control"
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>
        </div>

        <hr class="section-divider" />

        <!-- SECTION 4: PDF PAGE SETTINGS -->
        <div class="settings-section">
          <div class="section-header">
            <span class="step-num">4</span>
            <div>
              <h2 class="section-title">PDF Settings</h2>
              <p class="section-desc">Page geometry and printable borders</p>
            </div>
          </div>

          <div class="form-grid-3">
            <!-- Page Size -->
            <div class="form-group">
              <label for="pageSizeSelect">Page Size</label>
              <select id="pageSizeSelect" formControlName="pageSize" class="form-select">
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A3">A3 (297 × 420 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="Custom">Custom Dimensions</option>
              </select>
            </div>

            <!-- Orientation -->
            <div class="form-group">
              <label for="orientationSelect">Orientation</label>
              <select id="orientationSelect" formControlName="orientation" class="form-select">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <!-- Page Margin -->
            <div class="form-group">
              <label for="pageMarginInput">Page Margin (mm)</label>
              <input
                id="pageMarginInput"
                type="number"
                formControlName="pageMargin"
                class="form-control"
                min="0"
                max="100"
                step="1"
              />
            </div>
          </div>

          <!-- Custom Dimensions (Shown when Page Size is Custom) -->
          <div class="form-grid-2 custom-dims" *ngIf="form.get('pageSize')?.value === 'Custom'">
            <div class="form-group">
              <label for="customWidthInput">Custom Width (mm)</label>
              <input
                id="customWidthInput"
                type="number"
                formControlName="customPageWidth"
                class="form-control"
                min="50"
                max="1000"
                step="1"
              />
            </div>
            <div class="form-group">
              <label for="customHeightInput">Custom Height (mm)</label>
              <input
                id="customHeightInput"
                type="number"
                formControlName="customPageHeight"
                class="form-control"
                min="50"
                max="1000"
                step="1"
              />
            </div>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div class="actions-row">
          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="isBusy || form.invalid || !!rangeError"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
            </svg>
            <span>Generate QR Codes</span>
          </button>

          <button
            type="button"
            class="btn btn-secondary"
            [disabled]="isBusy"
            (click)="onReset()"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
            </svg>
            <span>Reset</span>
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .settings-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    .settings-section {
      margin-bottom: 1.25rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #eff6ff;
      color: #2563eb;
      font-weight: 700;
      font-size: 0.85rem;
      border: 1px solid #bfdbfe;
      flex-shrink: 0;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .section-desc {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.1rem 0 0 0;
    }

    .section-divider {
      border: none;
      border-top: 1px solid #f1f5f9;
      margin: 1.5rem 0;
    }

    .range-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .custom-dims {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #334155;
    }

    .label-with-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .calc-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .prefix-group {
      margin-top: 1rem;
      margin-bottom: 0.25rem;
    }

    .prefix-control {
      font-family: monospace;
      letter-spacing: 0.02em;
    }

    .preview-badge {
      font-size: 0.72rem;
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      font-family: monospace;
    }

    .field-hint {
      display: block;
      font-size: 0.775rem;
      color: #64748b;
      margin-top: 0.35rem;

      code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: monospace;
      }
    }

    .form-control,
    .form-select {
      width: 100%;
      height: 40px;
      padding: 0.5rem 0.75rem;
      font-size: 0.9rem;
      color: #0f172a;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      box-sizing: border-box;

      &:focus {
        border-color: #3b82f6;
        outline: 0;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
      }

      &.is-invalid {
        border-color: #ef4444;
      }
    }

    .input-group {
      display: flex;
      width: 100%;

      .form-control {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-right: none;
      }

      .unit-select {
        width: 70px;
        flex-shrink: 0;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        background-color: #f8fafc;
        font-weight: 500;
      }
    }

    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      height: 40px;
      padding: 0.25rem 0.5rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #ffffff;

      .color-input {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        padding: 0;
        background: none;
      }

      .color-value {
        font-family: monospace;
        font-size: 0.85rem;
        color: #475569;
      }
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.65rem 0.85rem;
      border-radius: 8px;
      font-size: 0.825rem;
      line-height: 1.35;
    }

    .alert-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .alert-warning {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .toggle-wrapper {
      margin-top: 1rem;
    }

    .toggle-container {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease, border-color 0.15s ease;

      &:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
      }

      &.active {
        background: #eff6ff;
        border-color: #93c5fd;
      }
    }

    .toggle-checkbox {
      width: 18px;
      height: 18px;
      margin-top: 0.2rem;
      accent-color: #2563eb;
      cursor: pointer;
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .toggle-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #0f172a;
    }

    .toggle-desc {
      font-size: 0.775rem;
      color: #64748b;
      line-height: 1.35;
    }

    .actions-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 2rem;
      padding-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 44px;
      padding: 0 1.5rem;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease-in-out;
      border: none;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);

      &:hover:not(:disabled) {
        background: #1d4ed8;
        box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
      }

      &:active:not(:disabled) {
        background: #1e40af;
      }
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;

      &:hover:not(:disabled) {
        background: #e2e8f0;
        color: #1e293b;
      }
    }

    @media (max-width: 900px) {
      .range-grid,
      .form-grid-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .settings-card {
        padding: 1.25rem;
      }

      .range-grid,
      .form-grid-2,
      .form-grid-3 {
        grid-template-columns: 1fr;
      }

      .actions-row {
        flex-direction: column;
        .btn {
          width: 100%;
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private qrService = inject(QrCodeService);

  readonly maxBatchSize = MAX_BATCH_SIZE;

  @Input() isBusy = false;
  @Output() configChange = new EventEmitter<QrGeneratorConfig>();
  @Output() generateRequested = new EventEmitter<QrGeneratorConfig>();
  @Output() resetRequested = new EventEmitter<void>();

  form!: FormGroup;
  lastCalculatedField: 'count' | 'endNumber' = 'endNumber';
  rangeError: string | null = null;
  contrastWarning = false;

  private isInternalUpdate = false;

  ngOnInit(): void {
    this.initForm(DEFAULT_CONFIG);
  }

  private initForm(config: QrGeneratorConfig): void {
    this.form = this.fb.group({
      startNumber: [config.startNumber, [Validators.required, Validators.min(0)]],
      endNumber: [config.endNumber, [Validators.required, Validators.min(0)]],
      count: [config.count, [Validators.required, Validators.min(1), Validators.max(MAX_BATCH_SIZE)]],
      prefix: [config.prefix || ''],

      width: [config.width, [Validators.required, Validators.min(10)]],
      height: [config.height, [Validators.required, Validators.min(10)]],
      widthUnit: [config.widthUnit, Validators.required],
      heightUnit: [config.heightUnit, Validators.required],

      qrMargin: [config.qrMargin, [Validators.required, Validators.min(0)]],
      errorCorrection: [config.errorCorrection, Validators.required],
      foregroundColor: [config.foregroundColor, Validators.required],
      backgroundColor: [config.backgroundColor, Validators.required],
      embedDataInside: [config.embedDataInside],

      columns: [config.columns, [Validators.required, Validators.min(1), Validators.max(20)]],
      horizontalGap: [config.horizontalGap, [Validators.required, Validators.min(0)]],
      verticalGap: [config.verticalGap, [Validators.required, Validators.min(0)]],
      labelPosition: [config.labelPosition, Validators.required],

      pageSize: [config.pageSize, Validators.required],
      customPageWidth: [config.customPageWidth || 210, [Validators.min(50)]],
      customPageHeight: [config.customPageHeight || 297, [Validators.min(50)]],
      orientation: [config.orientation, Validators.required],
      pageMargin: [config.pageMargin, [Validators.required, Validators.min(0)]],
    });

    this.validateRange();
    this.checkContrast();

    // Listen to changes to emit to parent
    this.form.valueChanges.subscribe(() => {
      if (!this.isInternalUpdate) {
        this.validateRange();
        if (this.form.valid && !this.rangeError) {
          this.emitConfig();
        }
      }
    });
  }

  onCountChanged(): void {
    if (this.isInternalUpdate) return;

    const countVal = Number(this.form.get('count')?.value);
    const startVal = Number(this.form.get('startNumber')?.value);

    if (!isNaN(countVal) && !isNaN(startVal) && countVal > 0) {
      const calculatedEnd = startVal + countVal - 1;
      this.isInternalUpdate = true;
      this.form.patchValue({ endNumber: calculatedEnd }, { emitEvent: false });
      this.lastCalculatedField = 'endNumber';
      this.isInternalUpdate = false;
    }
    this.validateRange();
    this.emitConfig();
  }

  onEndNumberChanged(): void {
    if (this.isInternalUpdate) return;

    const startVal = Number(this.form.get('startNumber')?.value);
    const endVal = Number(this.form.get('endNumber')?.value);

    if (!isNaN(startVal) && !isNaN(endVal)) {
      const calculatedCount = endVal - startVal + 1;
      this.isInternalUpdate = true;
      this.form.patchValue({ count: calculatedCount }, { emitEvent: false });
      this.lastCalculatedField = 'count';
      this.isInternalUpdate = false;
    }
    this.validateRange();
    this.emitConfig();
  }

  onStartNumberChanged(): void {
    if (this.isInternalUpdate) return;

    const startVal = Number(this.form.get('startNumber')?.value);
    const countVal = Number(this.form.get('count')?.value);
    const endVal = Number(this.form.get('endNumber')?.value);

    if (isNaN(startVal)) {
      this.validateRange();
      return;
    }

    this.isInternalUpdate = true;
    if (this.lastCalculatedField === 'endNumber') {
      // Mode 1: keep count, update endNumber
      if (!isNaN(countVal) && countVal > 0) {
        this.form.patchValue({ endNumber: startVal + countVal - 1 }, { emitEvent: false });
      }
    } else {
      // Mode 2: keep endNumber, update count
      if (!isNaN(endVal)) {
        this.form.patchValue({ count: endVal - startVal + 1 }, { emitEvent: false });
      }
    }
    this.isInternalUpdate = false;
    this.validateRange();
    this.emitConfig();
  }

  validateRange(): void {
    const startVal = Number(this.form.get('startNumber')?.value);
    const endVal = Number(this.form.get('endNumber')?.value);
    const countVal = Number(this.form.get('count')?.value);

    if (isNaN(startVal) || isNaN(endVal) || isNaN(countVal)) {
      this.rangeError = 'Please enter valid integer numbers.';
      return;
    }

    if (!Number.isInteger(startVal) || !Number.isInteger(endVal) || !Number.isInteger(countVal)) {
      this.rangeError = 'Only whole integer numbers are supported.';
      return;
    }

    if (startVal < 0 || endVal < 0) {
      this.rangeError = 'Negative numbers are not allowed.';
      return;
    }

    if (countVal <= 0) {
      this.rangeError = 'Number of QR codes must be greater than 0.';
      return;
    }

    if (startVal > endVal) {
      this.rangeError = 'Start number must be less than or equal to end number.';
      return;
    }

    if (countVal > MAX_BATCH_SIZE) {
      this.rangeError = `Maximum supported batch size is ${MAX_BATCH_SIZE.toLocaleString()} QR codes.`;
      return;
    }

    this.rangeError = null;
  }

  checkContrast(): void {
    const fg = this.form.get('foregroundColor')?.value;
    const bg = this.form.get('backgroundColor')?.value;
    if (fg && bg) {
      const contrast = this.qrService.checkContrastRatio(fg, bg);
      this.contrastWarning = !contrast.sufficient;
    }
  }

  emitConfig(): void {
    if (this.form.valid && !this.rangeError) {
      const formVal = this.form.value;
      const config: QrGeneratorConfig = {
        ...formVal,
        lastEditedMode: this.lastCalculatedField === 'endNumber' ? 'count' : 'range',
      };
      this.configChange.emit(config);
    }
  }

  onGenerate(): void {
    this.validateRange();
    if (this.form.valid && !this.rangeError) {
      const config: QrGeneratorConfig = {
        ...this.form.value,
        lastEditedMode: this.lastCalculatedField === 'endNumber' ? 'count' : 'range',
      };
      this.generateRequested.emit(config);
    }
  }

  onReset(): void {
    this.isInternalUpdate = true;
    this.form.reset(DEFAULT_CONFIG);
    this.lastCalculatedField = 'endNumber';
    this.rangeError = null;
    this.contrastWarning = false;
    this.isInternalUpdate = false;
    this.resetRequested.emit();
    this.emitConfig();
  }
}
