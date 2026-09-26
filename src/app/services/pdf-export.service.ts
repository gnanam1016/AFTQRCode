import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import {
  ExportProgress,
  QrCodeItem,
  QrGeneratorConfig,
} from '../models/qr-code.model';
import { LayoutCalcService } from './layout-calc.service';

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  private layoutCalc = inject(LayoutCalcService);

  /**
   * Generates a multi-page PDF document containing all QR codes arranged in the configured grid
   */
  async exportPdf(
    items: QrCodeItem[],
    config: QrGeneratorConfig,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    if (!items || items.length === 0) {
      throw new Error('No QR codes available to export.');
    }

    const layout = this.layoutCalc.calculatePages(config);
    const orientation = config.orientation === 'landscape' ? 'l' : 'p';

    // Configure format for jsPDF
    let format: string | [number, number];
    if (config.pageSize === 'Custom') {
      format = [layout.pageWidthMm, layout.pageHeightMm];
    } else {
      format = config.pageSize.toLowerCase();
    }

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    const total = items.length;
    const margin = Math.max(0, config.pageMargin || 0);
    const columns = layout.columns;
    const qrWidth = layout.qrWidthMm;
    const qrHeight = layout.qrHeightMm;
    const hGap = Math.max(0, config.horizontalGap || 0);
    const vGap = Math.max(0, config.verticalGap || 0);
    const labelHeight = this.layoutCalc.LABEL_HEIGHT_MM;
    const labelGap = this.layoutCalc.LABEL_GAP_MM;
    const cellHeight = layout.cellHeightMm;
    const rowsPerPage = layout.rowsPerPage;
    const codesPerPage = layout.qrCodesPerPage;

    // Font styling for labels
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59); // Slate-800

    let currentPage = 1;

    for (let index = 0; index < total; index++) {
      const item = items[index];

      // Check if we need to start a new page
      if (index > 0 && index % codesPerPage === 0) {
        pdf.addPage(format, orientation);
        currentPage++;
      }

      // Calculate position within current page
      const pageIndex = index % codesPerPage;
      const colIndex = pageIndex % columns;
      const rowIndex = Math.floor(pageIndex / columns);

      const cellX = margin + colIndex * (qrWidth + hGap);
      const cellY = margin + rowIndex * (cellHeight + vGap);

      let qrY = cellY;
      let textY = cellY;

      if (config.labelPosition === 'above') {
        textY = cellY + labelHeight - 1.5;
        qrY = cellY + labelHeight + labelGap;
      } else if (config.labelPosition === 'below') {
        qrY = cellY;
        textY = cellY + qrHeight + labelGap + labelHeight - 1.5;
      }

      // 1. Draw QR Code image
      if (item.dataUrl) {
        pdf.addImage(item.dataUrl, 'PNG', cellX, qrY, qrWidth, qrHeight, undefined, 'FAST');
      }

      // 2. Draw label text if enabled
      if (config.labelPosition !== 'none') {
        const centerX = cellX + qrWidth / 2;
        const availableLabelWidth = qrWidth * 0.95;
        const defaultFontSize = 10;
        pdf.setFontSize(defaultFontSize);
        const textWidthMm = pdf.getTextWidth(item.text);
        if (textWidthMm > availableLabelWidth && textWidthMm > 0) {
          const scaledFontSize = Math.max(5, Math.floor(defaultFontSize * (availableLabelWidth / textWidthMm)));
          pdf.setFontSize(scaledFontSize);
        }
        pdf.text(item.text, centerX, textY, { align: 'center' });
        pdf.setFontSize(defaultFontSize);
      }

      // Update progress every 25 items or at the end
      if (index % 25 === 0 || index === total - 1) {
        if (onProgress) {
          const current = index + 1;
          const percentage = Math.round((current / total) * 100);
          onProgress({
            status: 'pdf',
            current,
            total,
            percentage,
            message: `Building PDF... ${current.toLocaleString()} / ${total.toLocaleString()}`,
          });
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const startStr = (items[0]?.text ?? String(config.startNumber)).replace(/[<>:"/\\|?*]/g, '_');
    const endStr = (items[items.length - 1]?.text ?? String(config.endNumber)).replace(/[<>:"/\\|?*]/g, '_');
    const filename = `qr-codes-${startStr}-${endStr}.pdf`;

    pdf.save(filename);

    if (onProgress) {
      onProgress({
        status: 'complete',
        current: total,
        total,
        percentage: 100,
        message: `PDF exported: ${filename}`,
      });
    }
  }
}
