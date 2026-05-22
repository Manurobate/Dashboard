import { Component } from '@angular/core';
import packageJson from '../../../../../../package.json';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly version = packageJson.version;
}
