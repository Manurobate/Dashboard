import { Component } from '@angular/core';
import { injectIsPublicShareRoute } from '../../utils/public-share-route';
import packageJson from '../../../../../package.json';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly version = packageJson.version;
  /** Masqué sur les vues publiques : « Partagé via Dashboard » en tient lieu (maquette 11). */
  readonly isPublicView = injectIsPublicShareRoute();
}
