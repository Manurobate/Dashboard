import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { LinkCategoryCardComponent } from './link-category-card.component';
import { LinkCategory } from '../../link-categories.service';
import { Link } from '../../links.service';

const mockCat: LinkCategory = {
  id: 1,
  name: 'Dev',
  emoji: '💻',
  position: 0,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

describe('LinkCategoryCardComponent', () => {
  async function setup(editMode = false, links: Link[] = [mockLink]) {
    await TestBed.configureTestingModule({
      imports: [LinkCategoryCardComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    const fixture = TestBed.createComponent(LinkCategoryCardComponent);
    fixture.componentRef.setInput('category', mockCat);
    fixture.componentRef.setInput('links', links);
    fixture.componentRef.setInput('editMode', editMode);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('affiche le nom de la catégorie', async () => {
    const { fixture } = await setup();
    const nameEl = fixture.debugElement.query(By.css('.category-name'));
    expect(nameEl.nativeElement.textContent.trim()).toBe('Dev');
  });

  it('affiche l\'emoji de la catégorie', async () => {
    const { fixture } = await setup();
    const emojiEl = fixture.debugElement.query(By.css('.category-emoji'));
    expect(emojiEl.nativeElement.textContent.trim()).toBe('💻');
  });

  it('émet editCategory quand le bouton modifier est cliqué', async () => {
    const { fixture, component } = await setup(true);
    const emitted: LinkCategory[] = [];
    component.editCategory.subscribe((v) => emitted.push(v));

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
    const editBtn = buttons.find(
      (b) => b.nativeElement.getAttribute('aria-label') === 'Modifier la catégorie',
    );
    editBtn?.nativeElement.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(mockCat);
  });

  it('émet deleteCategory quand le bouton supprimer est cliqué', async () => {
    const { fixture, component } = await setup(true);
    const emitted: LinkCategory[] = [];
    component.deleteCategory.subscribe((v) => emitted.push(v));

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-icon-button]'));
    const deleteBtn = buttons.find(
      (b) => b.nativeElement.getAttribute('aria-label') === 'Supprimer la catégorie',
    );
    deleteBtn?.nativeElement.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(mockCat);
  });

  it('émet addLink avec le categoryId quand le bouton ajouter un lien est cliqué', async () => {
    const { fixture, component } = await setup(true);
    const emitted: number[] = [];
    component.addLink.subscribe((v) => emitted.push(v));

    const addBtn = fixture.debugElement.query(By.css('.add-link-button'));
    addBtn.nativeElement.click();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toBe(1);
  });

  it('affiche le drag handle et les actions en mode édition', async () => {
    const { fixture } = await setup(true);
    const header = fixture.debugElement.query(By.css('.category-header'));
    expect(header.query(By.css('.drag-handle'))).toBeTruthy();
    expect(header.query(By.css('.category-actions'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.add-link-button'))).toBeTruthy();
  });

  it('masque le drag handle et les actions en mode lecture', async () => {
    const { fixture } = await setup(false);
    const header = fixture.debugElement.query(By.css('.category-header'));
    expect(header.query(By.css('.drag-handle'))).toBeNull();
    expect(header.query(By.css('.category-actions'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.add-link-button'))).toBeNull();
  });

  describe('dropLink()', () => {
    it('ne fait rien si previousIndex === currentIndex', async () => {
      const { component } = await setup(true);
      const emitted: unknown[] = [];
      component.reorderLinks.subscribe((v) => emitted.push(v));

      component.dropLink({ previousIndex: 0, currentIndex: 0 } as any);

      expect(emitted).toHaveLength(0);
    });

    it('réorganise les liens et émet reorderLinks avec les nouvelles positions', async () => {
      const link2: Link = { ...mockLink, id: 11, position: 1 };
      const { component } = await setup(true, [mockLink, link2]);
      const emitted: { id: number; position: number }[][] = [];
      component.reorderLinks.subscribe((v) => emitted.push(v));

      component.dropLink({ previousIndex: 0, currentIndex: 1 } as any);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual([
        { id: 11, position: 0 },
        { id: 10, position: 1 },
      ]);
    });

    it('émet reorderLinks si previousContainer === container', async () => {
      const link2: Link = { ...mockLink, id: 11, position: 1 };
      const { component } = await setup(true, [mockLink, link2]);
      const emitted: unknown[] = [];
      component.reorderLinks.subscribe((v) => emitted.push(v));

      const fakeContainer = { data: [mockLink, link2] } as any;
      component.dropLink({
        previousContainer: fakeContainer,
        container: fakeContainer,
        previousIndex: 0,
        currentIndex: 1,
      } as any);

      expect(emitted).toHaveLength(1);
    });

    it('émet moveLink si previousContainer !== container', async () => {
      const { component } = await setup(true, [mockLink]);
      const emitted: { linkId: number; targetCategoryId: number }[] = [];
      component.moveLink.subscribe((v) => emitted.push(v));

      const sourceContainer = { data: [mockLink] } as any;
      const targetContainer = { data: [] } as any;
      component.dropLink({
        previousContainer: sourceContainer,
        container: targetContainer,
        previousIndex: 0,
        currentIndex: 0,
      } as any);

      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toEqual({ linkId: 10, targetCategoryId: 1 });
    });

    it('ne émet pas moveLink si previousContainer === container (même index)', async () => {
      const { component } = await setup(true, [mockLink]);
      const moveLinkEmitted: unknown[] = [];
      const reorderEmitted: unknown[] = [];
      component.moveLink.subscribe((v) => moveLinkEmitted.push(v));
      component.reorderLinks.subscribe((v) => reorderEmitted.push(v));

      const fakeContainer = { data: [mockLink] } as any;
      component.dropLink({
        previousContainer: fakeContainer,
        container: fakeContainer,
        previousIndex: 0,
        currentIndex: 0,
      } as any);

      expect(moveLinkEmitted).toHaveLength(0);
      expect(reorderEmitted).toHaveLength(0);
    });
  });
});
