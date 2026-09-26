import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DEFAULT_CONFIG,
  ExportProgress,
  QrCodeItem,
  QrGeneratorConfig,
} from '../../models/qr-code.model';
import { QrCodeService } from '../../services/qr-code.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { PngExportService } from '../../services/png-export.service';
import { HeaderComponent } from '../header/header.component';
import { QrSettingsComponent } from '../qr-settings/qr-settings.component';
import { GenerationSummaryComponent } from '../generation-summary/generation-summary.component';
import { QrPreviewComponent } from '../qr-preview/qr-preview.component';

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    QrSettingsComponent,
    GenerationSummaryComponent,
    QrPreviewComponent,
  ],
  template: `
    <div class="app-layout">
      <!-- HEADER -->
      <app-header></app-header>

      <!-- MAIN CONTAINER -->
      <main class="main-content">
        <!-- Notification Banner -->
        <div *ngIf="notification" class="toast-banner" [ngClass]="'toast-' + notification.type">
          <div class="toast-content">
            <svg *ngIf="notification.type === 'success'" viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg *ngIf="notification.type === 'error'" viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>{{ notification.message }}</span>
          </div>
          <button class="toast-close" (click)="notification = null">×</button>
        </div>

        <!-- TOP DASHBOARD: SETTINGS + SUMMARY -->
        <div class="dashboard-grid">
          <!-- Configuration Panel (Left) -->
          <div class="grid-left">
            <app-qr-settings
              [isBusy]="isBusy"
              (configChange)="onConfigChanged($event)"
              (generateRequested)="onGenerate($event)"
              (resetRequested)="onReset()"
            ></app-qr-settings>
          </div>

          <!-- Generation Summary (Right) -->
          <div class="grid-right">
            <app-generation-summary
              [config]="currentConfig"
              [generatedCount]="generatedItems.length"
              [isBusy]="isBusy"
              [progress]="progress"
              (exportPdfRequested)="onExportPdf()"
              (exportZipRequested)="onExportZip()"
            ></app-generation-summary>
          </div>
        </div>

        <!-- BOTTOM DASHBOARD: QR CODE PREVIEW -->
        <div class="preview-section">
          <app-qr-preview
            [items]="generatedItems"
            [config]="currentConfig"
            [isBusy]="isBusy"
            [progress]="progress"
            (downloadSinglePng)="onDownloadSinglePng($event)"
          ></app-qr-preview>
        </div>
      </main>

      <footer class="app-footer">
        <p>Bulk QR Code Generator — 100% Client-Side In-Browser Generation & Packaging</p>
      </footer>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: #f8fafc;
      color: #0f172a;
    }

    .main-content {
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 1.5rem;
      box-sizing: border-box;
      flex: 1;
    }

    .toast-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      font-size: 0.9rem;
      font-weight: 500;
      animation: fadeIn 0.2s ease-in-out;

      &.toast-success {
        background: #f0fdf4;
        color: #166534;
        border: 1px solid #bbf7d0;
      }

      &.toast-error {
        background: #fef2f2;
        color: #991b1b;
        border: 1px solid #fecaca;
      }
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .toast-close {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
      padding: 0;
      line-height: 1;
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 1.5rem;
      align-items: stretch;
    }

    .grid-left {
      min-width: 0;
    }

    .grid-right {
      min-width: 0;
    }

    .preview-section {
      width: 100%;
    }

    .app-footer {
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 1rem 1.5rem;
      text-align: center;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .main-content {
        padding: 0.75rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrGeneratorComponent {
  private qrService = inject(QrCodeService);
  private pdfExportService = inject(PdfExportService);
  private pngExportService = inject(PngExportService);
  private cdr = inject(ChangeDetectorRef);

  currentConfig: QrGeneratorConfig = { ...DEFAULT_CONFIG };
  generatedItems: QrCodeItem[] = [];
  isBusy = false;
  progress: ExportProgress | null = null;
  notification: { type: 'success' | 'error'; message: string } | null = null;

  onConfigChanged(newConfig: QrGeneratorConfig): void {
    this.currentConfig = { ...newConfig };
  }

  async onGenerate(config: QrGeneratorConfig): Promise<void> {
    this.currentConfig = { ...config };
    this.isBusy = true;
    this.notification = null;
    this.progress = {
      status: 'generating',
      current: 0,
      total: config.count,
      percentage: 0,
      message: 'Preparing range and generating QR codes...',
    };
    this.cdr.markForCheck();

    try {
      const numbers = this.qrService.generateNumbers(config.startNumber, config.endNumber);
      const items = await this.qrService.generateBatch(numbers, config, (prog) => {
        this.progress = prog;
        this.cdr.markForCheck();
      });

      this.generatedItems = items;
      const startDisplay = (config.prefix || '') + config.startNumber;
      const endDisplay = (config.prefix || '') + config.endNumber;
      this.notification = {
        type: 'success',
        message: `Successfully generated ${items.length.toLocaleString()} QR codes (${startDisplay} – ${endDisplay}).`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to generate the QR codes. Please check your settings and try again.';
      this.notification = {
        type: 'error',
        message: msg,
      };
    } finally {
      this.isBusy = false;
      this.cdr.markForCheck();
    }
  }

  onReset(): void {
    this.currentConfig = { ...DEFAULT_CONFIG };
    this.generatedItems = [];
    this.isBusy = false;
    this.progress = null;
    this.notification = null;
    this.qrService.clearCache();
    this.cdr.markForCheck();
  }

  async onExportPdf(): Promise<void> {
    if (this.generatedItems.length === 0 || this.isBusy) return;

    this.isBusy = true;
    this.progress = {
      status: 'pdf',
      current: 0,
      total: this.generatedItems.length,
      percentage: 0,
      message: 'Generating PDF document...',
    };
    this.cdr.markForCheck();

    try {
      await this.pdfExportService.exportPdf(
        this.generatedItems,
        this.currentConfig,
        (prog) => {
          this.progress = prog;
          this.cdr.markForCheck();
        }
      );
      this.notification = {
        type: 'success',
        message: 'PDF exported successfully!',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export PDF.';
      this.notification = {
        type: 'error',
        message: msg,
      };
    } finally {
      this.isBusy = false;
      this.cdr.markForCheck();
    }
  }

  async onExportZip(): Promise<void> {
    if (this.generatedItems.length === 0 || this.isBusy) return;

    this.isBusy = true;
    this.progress = {
      status: 'png',
      current: 0,
      total: this.generatedItems.length,
      percentage: 0,
      message: 'Preparing PNG ZIP archive...',
    };
    this.cdr.markForCheck();

    try {
      await this.pngExportService.exportBulkZip(
        this.generatedItems,
        this.currentConfig,
        (prog) => {
          this.progress = prog;
          this.cdr.markForCheck();
        }
      );
      this.notification = {
        type: 'success',
        message: `ZIP archive with ${this.generatedItems.length.toLocaleString()} PNGs downloaded successfully!`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PNG ZIP archive.';
      this.notification = {
        type: 'error',
        message: msg,
      };
    } finally {
      this.isBusy = false;
      this.cdr.markForCheck();
    }
  }

  async onDownloadSinglePng(item: QrCodeItem): Promise<void> {
    try {
      await this.pngExportService.downloadIndividualPng(item, this.currentConfig);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to download PNG.';
      this.notification = {
        type: 'error',
        message: msg,
      };
      this.cdr.markForCheck();
    }
  }
}
