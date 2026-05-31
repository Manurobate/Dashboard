import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { LinkItemComponent } from './link-item.component';
import { Link } from '../../links.service';

const mockLink: Link = {
  id: 10,
  url: 'https://example.com',
  title: 'Example',
  description: null,
  faviconUrl: 'https://example.com/favicon.ico',
  position: 0,
  categoryId: 1,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockLinkNoFavicon: Link = { ...mockLink, faviconUrl: null };

describe('LinkItemComponent', () => {
  async function setup(link: Link = mockLink, editMode = false) {
    await TestBed.configureTestingModule({
      imports: [LinkItemComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    const fixture = TestBed.createComponent(LinkItemComponent);
    fixture.componentRef.setInput('link', link);
    fixture.componentRef.setInput('editMode', editMode);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('affiche le favicon quand faviconUrl est défini', async () => {
    const { fixture } = await setup();
    const img = fixture.debugElement.query(By.css('.link-favicon'));
    expect(img).toBeTruthy();
    expect(img.nativeElement.getAttribute('src')).toBe('https://example.com/favicon.ico');
  });

  it('affiche la lettre initiale si faviconUrl est absent', async () => {
    const { fixture } = await setup(mockLinkNoFavicon);
    const initial = fixture.debugElement.query(By.css('.link-initial'));
    expect(initial).toBeTruthy();
    expect(initial.nativeElement.textContent.trim()).toBe('E');
  });

  it('affiche la lettre initiale si le favicon renvoie une erreur', async () => {
    const { fixture, component } = await setup();

    component.onFaviconError();
    fixture.detectChanges();

    const initial = fixture.debugElement.query(By.css('.link-initial'));
    expect(initial).toBeTruthy();
    const img = fixture.debugElement.query(By.css('.link-favicon'));
    expect(img).toBeNull();
  });

  it('le titre est un lien avec target="_blank" et rel="noopener noreferrer"', async () => {
    const { fixture } = await setup();
    const anchor = fixture.debugElement.query(By.css('a.link-title'));
    expect(anchor.nativeElement.getAttribute('target')).toBe('_blank');
    expect(anchor.nativeElement.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor.nativeElement.getAttribute('href')).toBe('https://example.com');
  });

  it('émet editLink quand le bouton modifier est cliqué', async () => {
    const { fixture, component } = await setup(mockLink, true);
    const emitted: Link[] = [];
    component.editLink.subscribe((v) => emitted.push(v));

    const editBtn = fixture.debugElement.query(By.css('button[aria-label="Modifier le lien"]'));
    editBtn.nativeElement.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(mockLink);
  });

  it('émet deleteLink quand le bouton supprimer est cliqué', async () => {
    const { fixture, component } = await setup(mockLink, true);
    const emitted: Link[] = [];
    component.deleteLink.subscribe((v) => emitted.push(v));

    const deleteBtn = fixture.debugElement.query(By.css('button[aria-label="Supprimer le lien"]'));
    deleteBtn.nativeElement.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(mockLink);
  });

  it("les boutons d'action ne sont pas dans le DOM en mode lecture", async () => {
    const { fixture } = await setup(mockLink, false);
    expect(fixture.debugElement.query(By.css('.link-actions'))).toBeNull();
  });

  it('le drag handle est toujours dans le DOM (indentation) mais invisible en lecture', async () => {
    const { fixture } = await setup(mockLink, false);
    const handle = fixture.debugElement.query(By.css('.drag-handle'));
    expect(handle).toBeTruthy();
    expect(handle.nativeElement.style.visibility).toBe('hidden');
  });

  it('les actions et le drag handle sont visibles en mode édition', async () => {
    const { fixture } = await setup(mockLink, true);
    expect(fixture.debugElement.query(By.css('.link-actions'))).toBeTruthy();
    const handle = fixture.debugElement.query(By.css('.drag-handle'));
    expect(handle.nativeElement.style.visibility).toBe('visible');
  });
});
