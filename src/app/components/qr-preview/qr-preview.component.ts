import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import {
  ExportProgress,
  QrCodeItem,
  QrGeneratorConfig,
} from '../../models/qr-code.model';

@Component({
  selector: 'app-qr-preview',
  standalone: true,
  imports: [CommonModule, ScrollingModule, FormsModule],
  template: `
    <div class="preview-container">
      <!-- PREVIEW HEADER -->
      <div class="preview-header">
        <div class="title-area">
          <h2 class="preview-title">QR Code Preview</h2>
          <div class="stats-badge" *ngIf="items.length > 0">
            <span class="badge-count">Generated: {{ items.length | number }} QR Codes</span>
            <span class="badge-range">Range: {{ items[0].value }} – {{ items[items.length - 1].value }}</span>
          </div>
        </div>

        <!-- Search / Filter toolbar when items exist -->
        <div class="toolbar-area" *ngIf="items.length > 0">
          <div class="search-box">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChanged()"
              placeholder="Search number (e.g. 1005)..."
              class="search-input"
            />
            <button *ngIf="searchQuery" (click)="clearSearch()" class="clear-btn" title="Clear search">×</button>
          </div>
          <span class="filter-count" *ngIf="searchQuery">
            Showing {{ filteredItems.length | number }} of {{ items.length | number }}
          </span>
        </div>
      </div>

      <!-- PROGRESS BAR (Shown during generation or export) -->
      <div class="progress-card" *ngIf="isBusy && progress">
        <div class="progress-info">
          <div class="progress-message">
            <div class="spinner"></div>
            <span class="message-text">{{ progress.message }}</span>
          </div>
          <span class="percentage-text">{{ progress.percentage }}%</span>
        </div>
        <div class="progress-track" role="progressbar" [attr.aria-valuenow]="progress.percentage" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" [style.width.%]="progress.percentage"></div>
        </div>
      </div>

      <!-- EMPTY STATE -->
      <div class="empty-state" *ngIf="!isBusy && items.length === 0">
        <div class="empty-icon-wrapper">
          <svg viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="#94a3b8" stroke-width="2">
            <rect x="6" y="6" width="14" height="14" rx="3" />
            <rect x="28" y="6" width="14" height="14" rx="3" />
            <rect x="28" y="28" width="14" height="14" rx="3" />
            <rect x="6" y="28" width="14" height="14" rx="3" />
            <path d="M13 13h.01M35 13h.01M13 35h.01M35 35h.01" stroke-width="5" stroke-linecap="round" />
            <circle cx="24" cy="24" r="3" fill="#cbd5e1" stroke="none" />
          </svg>
        </div>
        <h3 class="empty-title">No QR codes generated yet.</h3>
        <p class="empty-subtitle">
          Configure your QR code range and settings, then click "Generate QR Codes".
        </p>
      </div>

      <!-- NO SEARCH RESULTS -->
      <div class="empty-state" *ngIf="!isBusy && items.length > 0 && filteredItems.length === 0">
        <p class="empty-title">No matching QR codes found for "{{ searchQuery }}".</p>
        <button class="btn-link" (click)="clearSearch()">Reset search</button>
      </div>

      <!-- RESPONSIVE PREVIEW GRID WITH VIRTUAL SCROLLING -->
      <div class="grid-wrapper" *ngIf="filteredItems.length > 0">
        <!-- Virtual scroll viewport for ultra-fast rendering of thousands of items -->
        <cdk-virtual-scroll-viewport
          [itemSize]="rowHeight"
          class="virtual-viewport"
        >
          <div
            *cdkVirtualFor="let row of rowChunks; trackBy: trackByRowIndex"
            class="preview-row"
          >
            <div
              *ngFor="let item of row; trackBy: trackByItemValue"
              class="qr-card"
            >
              <div class="qr-image-container">
                <img
                  *ngIf="item.dataUrl"
                  [src]="item.dataUrl"
                  [alt]="'QR Code ' + item.text"
                  class="qr-image"
                  loading="lazy"
                />
              </div>

              <button
                type="button"
                class="btn-download-single"
                (click)="downloadSinglePng.emit(item)"
                title="Download {{ item.text }}.png"
              >
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </cdk-virtual-scroll-viewport>
      </div>
    </div>
  `,
  styles: [`
    .preview-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      margin-top: 1.75rem;
    }

    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .title-area {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .preview-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .stats-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #f1f5f9;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .badge-count {
      color: #1e293b;
    }

    .badge-range {
      color: #64748b;
      border-left: 1px solid #cbd5e1;
      padding-left: 0.5rem;
    }

    .toolbar-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      position: relative;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 0 0.65rem;
      height: 38px;
      color: #64748b;

      &:focus-within {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
      }
    }

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      padding: 0.4rem 0.5rem;
      font-size: 0.85rem;
      color: #0f172a;
      width: 180px;
    }

    .clear-btn {
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 1.1rem;
      cursor: pointer;
      line-height: 1;
      padding: 0 0.2rem;

      &:hover {
        color: #475569;
      }
    }

    .filter-count {
      font-size: 0.8rem;
      color: #64748b;
    }

    /* Progress Card */
    .progress-card {
      background: #f0f7ff;
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .progress-message {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #93c5fd;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .message-text {
      font-size: 0.9rem;
      font-weight: 600;
      color: #1e40af;
    }

    .percentage-text {
      font-size: 0.9rem;
      font-weight: 700;
      color: #1d4ed8;
      font-variant-numeric: tabular-nums;
    }

    .progress-track {
      height: 8px;
      background: #dbeafe;
      border-radius: 9999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
      transition: width 0.15s ease-out;
      border-radius: 9999px;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 1.5rem;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px dashed #cbd5e1;
    }

    .empty-icon-wrapper {
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: #334155;
      margin: 0 0 0.4rem 0;
    }

    .empty-subtitle {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0;
      max-width: 420px;
      line-height: 1.5;
    }

    .btn-link {
      background: none;
      border: none;
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
      margin-top: 0.5rem;
    }

    /* Grid & Cards */
    .grid-wrapper {
      width: 100%;
    }

    .virtual-viewport {
      height: 650px;
      width: 100%;
      outline: none;
    }

    .preview-row {
      display: grid;
      /* Responsive grid layout:
         Desktop: 5 or 4 columns
         Tablet: 3 columns
         Mobile: 2 columns
      */
      grid-template-columns: repeat(var(--preview-cols, 5), 1fr);
      gap: 1.25rem;
      padding-bottom: 1.25rem;
      box-sizing: border-box;
    }

    .qr-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
        border-color: #cbd5e1;
      }
    }

    .qr-image-container {
      width: 100%;
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fafafa;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 0.75rem;
      border: 1px solid #f1f5f9;
    }

    .qr-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .btn-download-single {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
      height: 32px;
      padding: 0 0.65rem;
      font-size: 0.775rem;
      font-weight: 600;
      color: #3b82f6;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
      }
    }

    @media (min-width: 1200px) {
      .preview-row {
        --preview-cols: 5;
      }
    }

    @media (min-width: 900px) and (max-width: 1199px) {
      .preview-row {
        --preview-cols: 4;
      }
    }

    @media (min-width: 640px) and (max-width: 899px) {
      .preview-row {
        --preview-cols: 3;
      }
    }

    @media (max-width: 639px) {
      .preview-row {
        --preview-cols: 2;
        gap: 0.75rem;
      }

      .preview-container {
        padding: 1rem;
      }

      .search-input {
        width: 130px;
      }

      .qr-label {
        font-size: 0.95rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrPreviewComponent implements OnChanges {
  @Input() items: QrCodeItem[] = [];
  @Input() config: QrGeneratorConfig = {} as QrGeneratorConfig;
  @Input() isBusy = false;
  @Input() progress: ExportProgress | null = null;

  @Output() downloadSinglePng = new EventEmitter<QrCodeItem>();

  searchQuery = '';
  filteredItems: QrCodeItem[] = [];
  rowChunks: QrCodeItem[][] = [];

  // Estimated height of each preview row for virtual scrolling
  readonly rowHeight = 240;
  private readonly itemsPerRow = 5;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.applyFilter();
    }
  }

  onFilterChanged(): void {
    this.applyFilter();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredItems = this.items;
    } else {
      this.filteredItems = this.items.filter((item) =>
        item.text.toLowerCase().includes(q)
      );
    }
    this.rebuildRowChunks();
  }

  private rebuildRowChunks(): void {
    const chunks: QrCodeItem[][] = [];
    const len = this.filteredItems.length;
    for (let i = 0; i < len; i += this.itemsPerRow) {
      chunks.push(this.filteredItems.slice(i, i + this.itemsPerRow));
    }
    this.rowChunks = chunks;
  }

  trackByRowIndex(index: number): number {
    return index;
  }

  trackByItemValue(index: number, item: QrCodeItem): number {
    return item.value;
  }
}
