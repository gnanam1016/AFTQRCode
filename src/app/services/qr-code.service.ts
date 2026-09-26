import { Injectable } from '@angular/core';
import QRCode from 'qrcode';
import {
  ExportProgress,
  MAX_BATCH_SIZE,
  QrCodeItem,
  QrGeneratorConfig,
} from '../models/qr-code.model';

@Injectable({
  providedIn: 'root',
})
export class QrCodeService {
  private cache = new Map<string, string>();

  /**
   * Generates sequential numbers between start and end (inclusive)
   */
  generateNumbers(start: number, end: number): number[] {
    const s = Math.floor(start);
    const e = Math.floor(end);
    if (s > e) return [];
    const count = e - s + 1;
    if (count > MAX_BATCH_SIZE) {
      throw new Error(`Maximum supported batch size is ${MAX_BATCH_SIZE.toLocaleString()} QR codes.`);
    }

    const numbers = new Array<number>(count);
    for (let i = 0; i < count; i++) {
      numbers[i] = s + i;
    }
    return numbers;
  }

  /**
   * Clears the in-memory QR code image cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Generates a cache key based on QR content and visual options
   */
  private getCacheKey(value: string, config: QrGeneratorConfig): string {
    return `${value}|${config.errorCorrection}|${config.qrMargin}|${config.foregroundColor}|${config.backgroundColor}|${config.embedDataInside}`;
  }

  /**
   * Generates a single QR code Data URL (PNG), optionally embedding the human-readable text inside
   */
  async generateQrDataUrl(value: string | number, config: QrGeneratorConfig): Promise<string> {
    const text = String(value);
    const cacheKey = this.getCacheKey(text, config);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // High resolution for clean rendering and crisp print exports
    const renderWidth = Math.max(256, Math.min(1024, config.widthUnit === 'px' ? config.width * 2 : 512));

    let ecLevel = config.errorCorrection;
    if (config.embedDataInside && ecLevel === 'L') {
      ecLevel = 'M';
    }

    // Attempt canvas rendering in browser to draw the center badge
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = renderWidth;
        canvas.height = renderWidth;
        const ctx = canvas.getContext('2d');

        if (ctx && typeof ctx.fillRect === 'function') {
          await QRCode.toCanvas(canvas, text, {
            width: renderWidth,
            margin: Math.max(1, config.qrMargin),
            errorCorrectionLevel: ecLevel,
            color: {
              dark: config.foregroundColor || '#000000',
              light: config.backgroundColor || '#FFFFFF',
            },
          });

          if (config.embedDataInside) {
            this.drawCenterBadge(ctx, text, renderWidth, config);
          }

          const dataUrl = canvas.toDataURL('image/png');
          this.cache.set(cacheKey, dataUrl);
          return dataUrl;
        }
      } catch {
        // Fall back to standard QRCode.toDataURL if canvas is not available
      }
    }

    const dataUrl = await QRCode.toDataURL(text, {
      width: renderWidth,
      margin: config.qrMargin,
      errorCorrectionLevel: ecLevel,
      color: {
        dark: config.foregroundColor || '#000000',
        light: config.backgroundColor || '#FFFFFF',
      },
    });

    this.cache.set(cacheKey, dataUrl);
    return dataUrl;
  }

  /**
   * Draws a clean, contrasting center text badge containing the QR data directly on the QR code
   */
  private drawCenterBadge(
    ctx: CanvasRenderingContext2D,
    text: string,
    size: number,
    config: QrGeneratorConfig
  ): void {
    const centerX = size / 2;
    const centerY = size / 2;

    let fontSize = Math.round(size * 0.085);
    ctx.font = `bold ${fontSize}px 'Inter', sans-serif, -apple-system`;
    let textMetrics = ctx.measureText(text);
    let textWidth = textMetrics.width;

    const maxBadgeWidth = size * 0.35;
    if (textWidth > maxBadgeWidth * 0.75) {
      fontSize = Math.round(fontSize * ((maxBadgeWidth * 0.75) / textWidth));
      ctx.font = `bold ${fontSize}px 'Inter', sans-serif, -apple-system`;
      textMetrics = ctx.measureText(text);
      textWidth = textMetrics.width;
    }

    const paddingX = Math.round(fontSize * 0.55);
    const paddingY = Math.round(fontSize * 0.28);
    const badgeWidth = textWidth + paddingX * 2;
    const badgeHeight = fontSize + paddingY * 2;
    const badgeX = centerX - badgeWidth / 2;
    const badgeY = centerY - badgeHeight / 2;
    const radius = Math.round(Math.min(8, badgeHeight / 3.5));

    ctx.save();
    ctx.fillStyle = config.backgroundColor || '#FFFFFF';
    ctx.strokeStyle = config.foregroundColor || '#000000';
    ctx.lineWidth = Math.max(2, Math.round(size * 0.006));

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
    } else {
      ctx.moveTo(badgeX + radius, badgeY);
      ctx.lineTo(badgeX + badgeWidth - radius, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
      ctx.lineTo(badgeX + radius, badgeY + badgeHeight);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
      ctx.lineTo(badgeX, badgeY + radius);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = config.foregroundColor || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, centerX, centerY + Math.round(fontSize * 0.04));
    ctx.restore();
  }

  /**
   * Converts a Data URL to a Blob
   */
  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  /**
   * Generates QR codes in asynchronous chunks so the UI remains completely responsive
   */
  async generateBatch(
    numbers: number[],
    config: QrGeneratorConfig,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<QrCodeItem[]> {
    const total = numbers.length;
    const items: QrCodeItem[] = new Array(total);
    const chunkSize = 50;

    for (let i = 0; i < total; i += chunkSize) {
      const sliceEnd = Math.min(i + chunkSize, total);

      // Process current chunk in parallel
      const chunkPromises = [];
      for (let j = i; j < sliceEnd; j++) {
        const val = numbers[j];
        chunkPromises.push(
          this.generateQrDataUrl(val, config).then((dataUrl) => {
            items[j] = {
              value: val,
              text: String(val),
              dataUrl,
            };
          })
        );
      }

      await Promise.all(chunkPromises);

      const processed = sliceEnd;
      const percentage = Math.round((processed / total) * 100);

      if (onProgress) {
        onProgress({
          status: 'generating',
          current: processed,
          total,
          percentage,
          message: `Generating QR Codes... ${processed.toLocaleString()} / ${total.toLocaleString()}`,
        });
      }

      // Yield thread to allow DOM/UI update
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (onProgress) {
      onProgress({
        status: 'complete',
        current: total,
        total,
        percentage: 100,
        message: `Generated: ${total.toLocaleString()} QR Codes`,
      });
    }

    return items;
  }

  /**
   * Evaluates contrast ratio between foreground and background
   */
  checkContrastRatio(fgHex: string, bgHex: string): { ratio: number; sufficient: boolean } {
    const parseHex = (hex: string) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((x) => x + x).join('');
      const num = parseInt(c, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    };

    const getLuminance = (rgb: { r: number; g: number; b: number }) => {
      const a = [rgb.r, rgb.g, rgb.b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    try {
      const l1 = getLuminance(parseHex(fgHex));
      const l2 = getLuminance(parseHex(bgHex));
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      const ratio = (lighter + 0.05) / (darker + 0.05);
      return { ratio, sufficient: ratio >= 3.0 };
    } catch {
      return { ratio: 21, sufficient: true };
    }
  }
}
