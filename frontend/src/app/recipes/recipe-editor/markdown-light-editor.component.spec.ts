import { TestBed } from '@angular/core/testing';
import { MarkdownLightEditorComponent } from './markdown-light-editor.component';

describe('MarkdownLightEditorComponent', () => {
  it('donne un nom accessible à chaque bouton de la barre d’outils (story 9.8)', async () => {
    await TestBed.configureTestingModule({
      imports: [MarkdownLightEditorComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(MarkdownLightEditorComponent);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.mle-toolbar button',
      ),
    );
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Gras',
      'Italique',
      'Souligné',
    ]);
  });
});
