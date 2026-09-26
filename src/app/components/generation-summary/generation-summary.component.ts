import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DEFAULT_CONFIG,
  ExportProgress,
  PageLayoutCalculation,
  QrGeneratorConfig,
} from '../../models/qr-code.model';
import { LayoutCalcService } from '../../services/layout-calc.service';

@Component({
  selector: 'app-generation-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="summary-card">
      <div class="summary-header">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
        <div>
          <h2 class="title">Generation Summary</h2>
          <p class="subtitle">Live layout & print estimation</p>
        </div>
      </div>

      <div class="metrics-grid">
        <!-- Metric: Total QR Codes -->
        <div class="metric-item highlight">
          <span class="metric-label">Total QR Codes</span>
          <span class="metric-value">{{ config.count | number }}</span>
          <span class="metric-sub">{{ (config.prefix || '') + config.startNumber }} – {{ (config.prefix || '') + config.endNumber }}</span>
        </div>

        <!-- Metric: Estimated Pages -->
        <div class="metric-item highlight">
          <span class="metric-label">Estimated Pages</span>
          <span class="metric-value">{{ layout.totalPages }}</span>
          <span class="metric-sub">{{ layout.qrCodesPerPage }} codes/page</span>
        </div>

        <!-- Metric: QR Dimensions -->
        <div class="metric-item">
          <span class="metric-label">QR Size</span>
          <span class="metric-value">{{ config.width }} × {{ config.height }} {{ config.widthUnit }}</span>
          <span class="metric-sub" *ngIf="config.widthUnit === 'px'">
            ≈ {{ layout.qrWidthMm | number:'1.1-1' }} × {{ layout.qrHeightMm | number:'1.1-1' }} mm
          </span>
        </div>

        <!-- Metric: PDF Sheet & Format -->
        <div class="metric-item">
          <span class="metric-label">PDF Sheet</span>
          <span class="metric-value">{{ config.pageSize }} {{ config.orientation | titlecase }}</span>
          <span class="metric-sub">{{ layout.pageWidthMm }} × {{ layout.pageHeightMm }} mm</span>
        </div>

        <!-- Metric: Grid Columns -->
        <div class="metric-item">
          <span class="metric-label">Columns Per Page</span>
          <span class="metric-value">{{ layout.columns }}</span>
          <span class="metric-sub">{{ layout.rowsPerPage }} rows per page</span>
        </div>

        <!-- Metric: Print Margins & Gaps -->
        <div class="metric-item">
          <span class="metric-label">Spacing</span>
          <span class="metric-value">{{ config.horizontalGap }} / {{ config.verticalGap }} mm</span>
          <span class="metric-sub">Margin: {{ config.pageMargin }} mm</span>
        </div>

        <!-- Metric: Data Display -->
        <div class="metric-item">
          <span class="metric-label">Data Inside QR</span>
          <span class="metric-value" [style.color]="config.embedDataInside ? '#16a34a' : '#64748b'">
            {{ config.embedDataInside ? 'Embedded' : 'External' }}
          </span>
          <span class="metric-sub">{{ config.embedDataInside ? 'Center badge readable' : 'Standard matrix' }}</span>
        </div>

        <!-- Metric: Data Prefix -->
        <div class="metric-item">
          <span class="metric-label">Data Prefix</span>
          <span class="metric-value prefix-val" [class.no-prefix]="!config.prefix">
            {{ config.prefix ? config.prefix : 'None' }}
          </span>
          <span class="metric-sub">{{ config.prefix ? 'Prepended to QR data' : 'Raw numeric sequence' }}</span>
        </div>
      </div>

      <!-- Layout Warnings -->
      <div class="alert alert-warning" *ngIf="layout.warnings.length > 0">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div class="warning-text">
          <div *ngFor="let warn of layout.warnings">{{ warn }}</div>
        </div>
      </div>

      <div class="alert alert-success" *ngIf="layout.fitsOnPage && generatedCount > 0">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>Layout fits perfectly within print margins. Scannability verified.</span>
      </div>

      <!-- EXPORT ACTIONS -->
      <div class="export-actions">
        <div class="export-title">Export Options</div>
        <div class="export-buttons">
          <!-- Export PDF -->
          <button
            type="button"
            class="btn btn-export btn-pdf"
            [disabled]="isBusy || generatedCount === 0"
            (click)="exportPdfRequested.emit()"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd" />
            </svg>
            <span *ngIf="progress?.status === 'pdf'">Generating PDF...</span>
            <span *ngIf="progress?.status !== 'pdf'">Export PDF</span>
          </button>

          <!-- Download PNGs (ZIP) -->
          <button
            type="button"
            class="btn btn-export btn-zip"
            [disabled]="isBusy || generatedCount === 0"
            (click)="exportZipRequested.emit()"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            <span *ngIf="progress?.status === 'png' || progress?.status === 'zip'">Preparing PNG ZIP...</span>
            <span *ngIf="progress?.status !== 'png' && progress?.status !== 'zip'">Download PNGs (ZIP)</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .summary-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;
    }

    .summary-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.5rem;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #f1f5f9;
      color: #334155;
    }

    .title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin: 0.1rem 0 0 0;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .metric-item {
      padding: 0.85rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      &.highlight {
        background: #f0f7ff;
        border-color: #c7dffd;

        .metric-label {
          color: #1e40af;
        }

        .metric-value {
          color: #1d4ed8;
          font-size: 1.4rem;
        }
      }
    }

    .metric-label {
      font-size: 0.725rem;
      text-transform: uppercase;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.03em;
    }

    .metric-value {
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;

      &.prefix-val {
        font-family: monospace;
        font-size: 1.05rem;
        word-break: break-all;

        &.no-prefix {
          font-family: inherit;
          color: #94a3b8;
          font-weight: 500;
        }
      }
    }

    .metric-sub {
      font-size: 0.75rem;
      color: #64748b;
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.75rem 0.9rem;
      border-radius: 8px;
      font-size: 0.8rem;
      margin-bottom: 1.25rem;
      line-height: 1.35;
    }

    .alert-warning {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .alert-success {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .export-actions {
      margin-top: auto;
      padding-top: 1.25rem;
      border-top: 1px solid #e2e8f0;
    }

    .export-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .export-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .btn-export {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 44px;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease-in-out;

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-pdf {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);

      &:hover:not(:disabled) {
        background: #0369a1;
      }
    }

    .btn-zip {
      background: #059669;
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);

      &:hover:not(:disabled) {
        background: #047857;
      }
    }

    @media (max-width: 640px) {
      .metrics-grid,
      .export-buttons {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationSummaryComponent implements OnChanges {
  private layoutCalc = inject(LayoutCalcService);

  @Input() config: QrGeneratorConfig = DEFAULT_CONFIG;
  @Input() generatedCount = 0;
  @Input() isBusy = false;
  @Input() progress: ExportProgress | null = null;

  @Output() exportPdfRequested = new EventEmitter<void>();
  @Output() exportZipRequested = new EventEmitter<void>();

  layout: PageLayoutCalculation = this.layoutCalc.calculatePages(DEFAULT_CONFIG);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      this.layout = this.layoutCalc.calculatePages(this.config);
    }
  }
}
