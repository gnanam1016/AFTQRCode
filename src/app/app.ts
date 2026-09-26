import { Component } from '@angular/core';
import { QrGeneratorComponent } from './components/qr-generator/qr-generator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [QrGeneratorComponent],
  template: `<app-qr-generator></app-qr-generator>`,
})
export class App {}
