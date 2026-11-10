import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { LinkDialogComponent, LinkDialogData } from './link-dialog.component';
import { LinksService, Link } from '../../links.service';

const mockLink: Link = {
  id: 10,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: null,
  position: 0,
  categoryId: 1,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LinkDialogComponent', () => {
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  async function setup(data: LinkDialogData = { categoryId: 1 }) {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [LinkDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: LinksService, useValue: { fetchOgPreview: vi.fn().mockReturnValue(of({})) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LinkDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('relie chaque label à son champ et suit les libellés de la maquette 18', async () => {
    const { fixture } = await setup();
    const labels = fixture.debugElement
      .queryAll(By.css('label.field-label'))
      .map((l) => l.nativeElement as HTMLLabelElement);
    expect(labels.map((l) => l.textContent?.replace('*', '').trim())).toEqual([
      'URL',
      'Titre',
      'URL du favicon',
      'Description',
    ]);
    for (const label of labels) {
      const field = fixture.nativeElement.querySelector(`#${label.htmlFor}`);
      expect(field).toBeTruthy();
    }
    expect(fixture.debugElement.query(By.css('mat-label'))).toBeNull();
  });

  it('marque URL et Titre comme requis (astérisque et aria-required)', async () => {
    const { fixture } = await setup();
    const required = fixture.debugElement.queryAll(By.css('.field-required'));
    expect(required).toHaveLength(2);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#link-url')?.getAttribute('aria-required')).toBe('true');
    expect(el.querySelector('#link-title')?.getAttribute('aria-required')).toBe('true');
    expect(el.querySelector('#link-favicon')?.getAttribute('aria-required')).not.toBe('true');
  });

  it('affiche les placeholders de la maquette', async () => {
    const { fixture } = await setup();
    const el = fixture.nativeElement as HTMLElement;
    const ph = (id: string) => (el.querySelector(`#${id}`) as HTMLInputElement).placeholder;
    expect(ph('link-url')).toBe('https://example.com');
    expect(ph('link-title')).toBe('Nom du lien');
    expect(ph('link-favicon')).toBe('Optionnel — récupéré automatiquement si vide');
    expect(ph('link-description')).toBe('Optionnel');
  });

  it('garde les validations : bouton désactivé tant que URL et Titre sont vides', async () => {
    const { fixture, component } = await setup();
    const confirm = fixture.debugElement.query(By.css('.dialog-primary-action'))
      .nativeElement as HTMLButtonElement;
    expect(confirm.textContent?.trim()).toBe('Ajouter');
    expect(confirm.disabled).toBe(true);

    component.form.patchValue({ url: 'https://a.fr', title: 'A' });
    fixture.detectChanges();
    expect(confirm.disabled).toBe(false);

    component.form.patchValue({ title: 'x'.repeat(256) });
    expect(component.form.get('title')?.hasError('maxlength')).toBe(true);
  });

  it('affiche le message d’erreur requis sous le champ URL après blur', async () => {
    const { fixture } = await setup();
    const input = fixture.nativeElement.querySelector('#link-url') as HTMLInputElement;
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    const error = fixture.debugElement.query(By.css('mat-error'));
    expect(error.nativeElement.textContent.trim()).toBe("L'URL est obligatoire");
  });

  it('le blur du champ URL normalise l’URL et lance la récupération OG (comportement conservé)', async () => {
    const { fixture, component } = await setup();
    const linksService = TestBed.inject(LinksService) as unknown as {
      fetchOgPreview: ReturnType<typeof vi.fn>;
    };
    const input = fixture.nativeElement.querySelector('#link-url') as HTMLInputElement;
    input.value = 'example.com';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    expect(component.form.value.url).toBe('https://example.com');
    expect(linksService.fetchOgPreview).toHaveBeenCalledWith('https://example.com');
  });

  it('en édition, pré-remplit le formulaire et affiche « Modifier »', async () => {
    const { fixture, component } = await setup({ link: mockLink, categoryId: 1 });
    expect(component.form.value.url).toBe('https://example.com');
    const title = fixture.debugElement.query(By.css('h2')).nativeElement as HTMLElement;
    expect(title.textContent?.trim()).toBe('Modifier le lien');
    const confirm = fixture.debugElement.query(By.css('.dialog-primary-action'))
      .nativeElement as HTMLButtonElement;
    expect(confirm.textContent?.trim()).toBe('Modifier');
  });
});
