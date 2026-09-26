import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="app-header">
      <div class="header-container">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01" stroke-width="3" stroke-linecap="round" />
            </svg>
          </div>
          <div class="brand-text">
            <div class="title-row">
              <h1 class="title">Bulk QR Code Generator</h1>
              <span class="badge badge-client">Client-Side Only</span>
              <span class="badge badge-perf">High Performance</span>
            </div>
            <p class="subtitle">
              Generate unique QR codes, customize their size, preview them, and export them in PDF or PNG format.
            </p>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .header-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .brand-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: linear-space, linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .subtitle {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0;
      line-height: 1.4;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .badge-client {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .badge-perf {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }

    @media (max-width: 640px) {
      .app-header {
        padding: 1rem;
      }
      .brand {
        align-items: flex-start;
      }
      .title {
        font-size: 1.25rem;
      }
      .brand-icon {
        width: 40px;
        height: 40px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {}
