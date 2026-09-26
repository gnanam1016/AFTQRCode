import { Injectable, inject } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ExportProgress, QrCodeItem, QrGeneratorConfig } from '../models/qr-code.model';
import { QrCodeService } from './qr-code.service';

@Injectable({
  providedIn: 'root',
})
export class PngExportService {
  private qrCodeService = inject(QrCodeService);

  /**
   * Triggers a browser file download using FileSaver or anchor fallback
   */
  downloadBlob(blob: Blob, filename: string): void {
    try {
      saveAs(blob, filename);
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  /**
   * Downloads a single QR code as {text}.png
   */
  async downloadIndividualPng(item: QrCodeItem, config: QrGeneratorConfig): Promise<void> {
    let dataUrl = item.dataUrl;
    if (!dataUrl) {
      dataUrl = await this.qrCodeService.generateQrDataUrl(item.text, config);
    }

    const blob = await this.qrCodeService.dataUrlToBlob(dataUrl);
    const safeName = (item.text || String(item.value)).replace(/[<>:"/\\|?*]/g, '_');
    const filename = `${safeName}.png`;
    this.downloadBlob(blob, filename);
  }

  /**
   * Creates a ZIP archive containing all QR codes as individual PNGs
   */
  async exportBulkZip(
    items: QrCodeItem[],
    config: QrGeneratorConfig,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new Error('No QR codes available to export.');
    }

    const zip = new JSZip();
    const total = items.length;

    // 1. Prepare PNGs and add to ZIP
    for (let index = 0; index < total; index++) {
      const item = items[index];
      let dataUrl = item.dataUrl;
      if (!dataUrl) {
        dataUrl = await this.qrCodeService.generateQrDataUrl(item.text, config);
      }

      // Extract base64 part
      const base64Data = dataUrl.split(',')[1];
      const safeName = (item.text || String(item.value)).replace(/[<>:"/\\|?*]/g, '_');
      const filename = `${safeName}.png`;
      zip.file(filename, base64Data, { base64: true });

      if (index % 50 === 0 || index === total - 1) {
        if (onProgress) {
          const current = index + 1;
          const percentage = Math.round((current / total) * 60); // 0% to 60% for image staging
          onProgress({
            status: 'png',
            current,
            total,
            percentage,
            message: `Preparing PNG files... ${current.toLocaleString()} / ${total.toLocaleString()}`,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // 2. Compress ZIP archive
    if (onProgress) {
      onProgress({
        status: 'zip',
        current: total,
        total,
        percentage: 75,
        message: 'Creating ZIP... Please wait...',
      });
    }

    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        if (onProgress) {
          const zipPercent = Math.round(60 + (metadata.percent * 0.4)); // 60% to 100%
          onProgress({
            status: 'zip',
            current: total,
            total,
            percentage: Math.min(99, zipPercent),
            message: `Creating ZIP... ${Math.round(metadata.percent)}%`,
          });
        }
      }
    );

    const startStr = (items[0]?.text ?? String(config.startNumber)).replace(/[<>:"/\\|?*]/g, '_');
    const endStr = (items[items.length - 1]?.text ?? String(config.endNumber)).replace(/[<>:"/\\|?*]/g, '_');
    const zipFilename = `qr-codes-${startStr}-${endStr}.zip`;

    this.downloadBlob(zipBlob, zipFilename);

    if (onProgress) {
      onProgress({
        status: 'complete',
        current: total,
        total,
        percentage: 100,
        message: `${total.toLocaleString()} QR codes successfully exported.`,
      });
    }
  }
}
