import { Component, inject, OnDestroy } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-share-view',
  standalone: true,
  template: `<p>Contenu partagé — disponible à partir de l'Épic 6</p>`,
})
export class ShareViewComponent implements OnDestroy {
  private readonly meta = inject(Meta);

  constructor() {
    this.meta.addTag({ name: 'robots', content: 'noindex' });
  }

  ngOnDestroy(): void {
    this.meta.removeTag("name='robots'");
  }
}
