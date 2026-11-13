import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { By } from '@angular/platform-browser';
import { LinksComponent } from './links.component';
import { AuthService, AuthUser } from '../core/services/auth.service';
import { LinkCategoriesService, LinkCategory } from './link-categories.service';
import { LinksService, Link } from './links.service';
import { LinksGridSettingsService, GridSettings } from './links-grid-settings.service';

const mockCat: LinkCategory = {
  id: 1,
  name: 'Dev',
  icon: null,
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

describe('LinksComponent', () => {
  let component: LinksComponent;
  let fixture: ComponentFixture<LinksComponent>;
  let linkCategoriesService: {
    loadCategories: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
    reorderCategories: ReturnType<typeof vi.fn>;
    categories: ReturnType<typeof signal<LinkCategory[]>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
  };
  let linksService: {
    loadLinks: ReturnType<typeof vi.fn>;
    createLink: ReturnType<typeof vi.fn>;
    updateLink: ReturnType<typeof vi.fn>;
    deleteLink: ReturnType<typeof vi.fn>;
    reorderLinks: ReturnType<typeof vi.fn>;
    moveLink: ReturnType<typeof vi.fn>;
    links: ReturnType<typeof signal<Link[]>>;
    isLoadingLinks: ReturnType<typeof signal<boolean>>;
  };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let gridSettingsService: {
    gridSettings: ReturnType<typeof signal<GridSettings>>;
    updateSettings: ReturnType<typeof vi.fn>;
  };
  let breakpointObserver: { observe: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    linkCategoriesService = {
      loadCategories: vi.fn().mockReturnValue(of([])),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      reorderCategories: vi.fn(),
      categories: signal<LinkCategory[]>([]),
      isLoading: signal(false),
      error: signal(null),
    };
    linksService = {
      loadLinks: vi.fn().mockReturnValue(of([])),
      createLink: vi.fn(),
      updateLink: vi.fn(),
      deleteLink: vi.fn(),
      reorderLinks: vi.fn(),
      moveLink: vi.fn(),
      links: signal<Link[]>([]),
      isLoadingLinks: signal(false),
    };
    dialog = { open: vi.fn() };
    snackBar = { open: vi.fn() };

    const gs = signal<GridSettings>({
      columns: 3,
      cardWidth: 280,
      gapH: 16,
      gapV: 16,
      linkHeight: 32,
    });
    gridSettingsService = {
      gridSettings: gs,
      updateSettings: vi.fn().mockImplementation((partial: Partial<GridSettings>) => {
        gs.update((s) => ({ ...s, ...partial }));
      }),
    };
    breakpointObserver = {
      observe: vi.fn().mockReturnValue(of({ matches: false, breakpoints: {} })),
    };

    await TestBed.configureTestingModule({
      imports: [LinksComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: LinkCategoriesService, useValue: linkCategoriesService },
        { provide: LinksService, useValue: linksService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: LinksGridSettingsService, useValue: gridSettingsService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinksComponent);
    component = fixture.componentInstance;
  });

  it('appelle loadCategories et loadLinks au démarrage', () => {
    component.ngOnInit();
    expect(linkCategoriesService.loadCategories).toHaveBeenCalled();
    expect(linksService.loadLinks).toHaveBeenCalled();
  });

  describe('editMode toggle', () => {
    it('editMode est false par défaut (mode lecture)', () => {
      expect(component.editMode()).toBe(false);
    });

    it('toggleEditMode() passe en mode édition', () => {
      component.toggleEditMode();
      expect(component.editMode()).toBe(true);
    });

    it('toggleEditMode() deux fois revient en mode lecture', () => {
      component.toggleEditMode();
      component.toggleEditMode();
      expect(component.editMode()).toBe(false);
    });
  });

  describe('openAddCategoryDialog()', () => {
    it('ouvre CategoryDialogComponent et crée la catégorie si confirmé', () => {
      const afterClosed$ = new Subject<{ name: string; icon?: string | null }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linkCategoriesService.createCategory.mockReturnValue(of(mockCat));

      component.openAddCategoryDialog();
      afterClosed$.next({ name: 'Dev', icon: 'home' });

      expect(linkCategoriesService.createCategory).toHaveBeenCalledWith('Dev', 'home');
      expect(snackBar.open).toHaveBeenCalledWith('Catégorie ajoutée', 'Fermer', { duration: 3000 });
    });

    it('ne crée rien si le dialog est fermé sans résultat', () => {
      const afterClosed$ = new Subject<undefined>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });

      component.openAddCategoryDialog();
      afterClosed$.next(undefined);

      expect(linkCategoriesService.createCategory).not.toHaveBeenCalled();
    });

    it("affiche un snackbar d'erreur si la création échoue", () => {
      const afterClosed$ = new Subject<{ name: string }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linkCategoriesService.createCategory.mockReturnValue(throwError(() => new Error('fail')));

      component.openAddCategoryDialog();
      afterClosed$.next({ name: 'Dev' });

      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la création', 'Fermer', {
        duration: 4000,
        panelClass: 'snackbar-error',
      });
    });
  });

  describe('openEditCategoryDialog()', () => {
    it('ouvre CategoryDialogComponent pré-rempli et met à jour si confirmé', () => {
      const updatedCat = { ...mockCat, name: 'Updated' };
      const afterClosed$ = new Subject<{ name: string }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linkCategoriesService.updateCategory.mockReturnValue(of(updatedCat));
      linkCategoriesService.categories.set([mockCat]);

      component.openEditCategoryDialog(mockCat);
      afterClosed$.next({ name: 'Updated' });

      expect(linkCategoriesService.updateCategory).toHaveBeenCalledWith(1, 'Updated', undefined);
      expect(snackBar.open).toHaveBeenCalledWith('Catégorie mise à jour', 'Fermer', {
        duration: 3000,
      });
    });
  });

  describe('openDeleteDialog()', () => {
    it('ouvre ConfirmDialogComponent et supprime si confirmé', () => {
      const afterClosed$ = new Subject<boolean>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linkCategoriesService.deleteCategory.mockReturnValue(of(undefined));
      linkCategoriesService.categories.set([mockCat]);

      component.openDeleteDialog(mockCat);
      afterClosed$.next(true);

      expect(linkCategoriesService.deleteCategory).toHaveBeenCalledWith(1);
      expect(snackBar.open).toHaveBeenCalledWith('Catégorie supprimée', 'Fermer', {
        duration: 3000,
      });
    });

    it("ne supprime pas si l'utilisateur annule", () => {
      const afterClosed$ = new Subject<boolean>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });

      component.openDeleteDialog(mockCat);
      afterClosed$.next(false);

      expect(linkCategoriesService.deleteCategory).not.toHaveBeenCalled();
    });
  });

  describe('drop()', () => {
    it('réorganise les catégories et appelle reorderCategories', () => {
      const cat2: LinkCategory = { ...mockCat, id: 2, position: 1 };
      linkCategoriesService.categories.set([mockCat, cat2]);
      linkCategoriesService.reorderCategories.mockReturnValue(of(undefined));

      component.drop({ previousIndex: 0, currentIndex: 1 } as any);

      expect(linkCategoriesService.reorderCategories).toHaveBeenCalledWith([
        { id: 2, position: 0 },
        { id: 1, position: 1 },
      ]);
    });

    it('rollback sur erreur du reorder', () => {
      const cat2: LinkCategory = { ...mockCat, id: 2, position: 1 };
      linkCategoriesService.categories.set([mockCat, cat2]);
      linkCategoriesService.reorderCategories.mockReturnValue(throwError(() => new Error('fail')));

      component.drop({ previousIndex: 0, currentIndex: 1 } as any);

      expect(linkCategoriesService.loadCategories).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la réorganisation', 'Fermer', {
        duration: 3000,
        panelClass: 'snackbar-error',
      });
    });
  });

  describe('linksForCategory()', () => {
    it('filtre les liens par categoryId', () => {
      const link2 = { ...mockLink, id: 11, categoryId: 2 };
      linksService.links.set([mockLink, link2]);
      expect(component.linksForCategory(1)).toEqual([mockLink]);
      expect(component.linksForCategory(2)).toEqual([link2]);
    });
  });

  describe('openAddLinkDialog()', () => {
    it('ouvre LinkDialogComponent et crée le lien si confirmé', () => {
      const afterClosed$ = new Subject<{ url: string; title: string; categoryId: number }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linksService.createLink.mockReturnValue(of(mockLink));
      linksService.links.set([]);

      component.openAddLinkDialog(1);
      afterClosed$.next({ url: 'https://example.com', title: 'Example', categoryId: 1 });

      expect(linksService.createLink).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Lien ajouté', 'Fermer', { duration: 3000 });
    });

    it('ne crée rien si dialog fermé sans résultat', () => {
      const afterClosed$ = new Subject<undefined>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });

      component.openAddLinkDialog(1);
      afterClosed$.next(undefined);

      expect(linksService.createLink).not.toHaveBeenCalled();
    });

    it("affiche un snackbar d'erreur si la création échoue", () => {
      const afterClosed$ = new Subject<{ url: string; title: string; categoryId: number }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linksService.createLink.mockReturnValue(throwError(() => new Error('fail')));

      component.openAddLinkDialog(1);
      afterClosed$.next({ url: 'https://example.com', title: 'Example', categoryId: 1 });

      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la création', 'Fermer', {
        duration: 4000,
        panelClass: 'snackbar-error',
      });
    });
  });

  describe('openEditLinkDialog()', () => {
    it('ouvre LinkDialogComponent pré-rempli et met à jour si confirmé', () => {
      const updatedLink = { ...mockLink, title: 'Updated' };
      const afterClosed$ = new Subject<{ url: string; title: string; categoryId: number }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linksService.updateLink.mockReturnValue(of(updatedLink));
      linksService.links.set([mockLink]);

      component.openEditLinkDialog(mockLink);
      afterClosed$.next({ url: 'https://example.com', title: 'Updated', categoryId: 1 });

      expect(linksService.updateLink).toHaveBeenCalledWith(10, {
        url: 'https://example.com',
        title: 'Updated',
      });
      expect(snackBar.open).toHaveBeenCalledWith('Lien mis à jour', 'Fermer', { duration: 3000 });
    });
  });

  describe('openDeleteLinkDialog()', () => {
    it('ouvre ConfirmDialogComponent et supprime si confirmé', () => {
      const afterClosed$ = new Subject<boolean>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linksService.deleteLink.mockReturnValue(of(undefined));
      linksService.links.set([mockLink]);

      component.openDeleteLinkDialog(mockLink);
      afterClosed$.next(true);

      expect(linksService.deleteLink).toHaveBeenCalledWith(10);
      expect(snackBar.open).toHaveBeenCalledWith('Lien supprimé', 'Fermer', { duration: 3000 });
    });

    it("ne supprime pas si l'utilisateur annule", () => {
      const afterClosed$ = new Subject<boolean>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });

      component.openDeleteLinkDialog(mockLink);
      afterClosed$.next(false);

      expect(linksService.deleteLink).not.toHaveBeenCalled();
    });
  });

  describe('handleReorderLinks()', () => {
    it('met à jour le signal links et appelle reorderLinks', () => {
      const link2: Link = { ...mockLink, id: 11, position: 1 };
      linksService.links.set([mockLink, link2]);
      linksService.reorderLinks.mockReturnValue(of(undefined));

      component.handleReorderLinks(1, [
        { id: 11, position: 0 },
        { id: 10, position: 1 },
      ]);

      expect(linksService.reorderLinks).toHaveBeenCalledWith([
        { id: 11, position: 0 },
        { id: 10, position: 1 },
      ]);
    });

    it('rollback sur erreur du reorderLinks', () => {
      linksService.links.set([mockLink]);
      linksService.reorderLinks.mockReturnValue(throwError(() => new Error('fail')));

      component.handleReorderLinks(1, [{ id: 10, position: 0 }]);

      expect(linksService.loadLinks).toHaveBeenCalled();
      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la réorganisation', 'Fermer', {
        duration: 3000,
        panelClass: 'snackbar-error',
      });
    });

    it('ne touche pas les liens des autres catégories', () => {
      const linkCat2: Link = { ...mockLink, id: 20, categoryId: 2, position: 0 };
      linksService.links.set([mockLink, linkCat2]);
      linksService.reorderLinks.mockReturnValue(of(undefined));

      component.handleReorderLinks(1, [{ id: 10, position: 0 }]);

      const remaining = linksService.links().find((l) => l.id === 20);
      expect(remaining).toBeDefined();
    });
  });

  describe('handleMoveLink()', () => {
    it('met à jour le categoryId du lien (optimistic update) et appelle moveLink', () => {
      linksService.links.set([{ ...mockLink, categoryId: 1 }]);
      linksService.moveLink.mockReturnValue(of({ ...mockLink, categoryId: 2 }));

      component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

      expect(linksService.links()[0].categoryId).toBe(2);
      expect(linksService.moveLink).toHaveBeenCalledWith(10, 2);
    });

    it('rollback du categoryId et affiche snackbar si moveLink échoue', () => {
      linksService.links.set([{ ...mockLink, categoryId: 1 }]);
      linksService.moveLink.mockReturnValue(throwError(() => new Error('network')));

      component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

      expect(linksService.links()[0].categoryId).toBe(1);
      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors du déplacement', 'Fermer', {
        duration: 3000,
        panelClass: 'snackbar-error',
      });
    });

    it('ne fait rien si le lien est introuvable', () => {
      linksService.links.set([]);
      component.handleMoveLink({ linkId: 999, targetCategoryId: 2 });
      expect(linksService.moveLink).not.toHaveBeenCalled();
    });

    it('affiche « Lien déplacé vers {catégorie} » 3s quand le déplacement réussit', () => {
      linkCategoriesService.categories.set([mockCat, { ...mockCat, id: 2, name: 'Admin' }]);
      linksService.links.set([{ ...mockLink, categoryId: 1 }]);
      linksService.moveLink.mockReturnValue(of({ ...mockLink, categoryId: 2 }));

      component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

      expect(snackBar.open).toHaveBeenCalledWith('Lien déplacé vers Admin', 'Fermer', {
        duration: 3000,
      });
    });

    it('affiche « Lien déplacé » si la catégorie cible est introuvable', () => {
      linkCategoriesService.categories.set([mockCat]);
      linksService.links.set([{ ...mockLink, categoryId: 1 }]);
      linksService.moveLink.mockReturnValue(of({ ...mockLink, categoryId: 99 }));

      component.handleMoveLink({ linkId: 10, targetCategoryId: 99 });

      expect(snackBar.open).toHaveBeenCalledWith('Lien déplacé', 'Fermer', { duration: 3000 });
    });

    it("n'affiche pas la snackbar de succès quand le déplacement échoue", () => {
      linkCategoriesService.categories.set([mockCat, { ...mockCat, id: 2, name: 'Admin' }]);
      linksService.links.set([{ ...mockLink, categoryId: 1 }]);
      linksService.moveLink.mockReturnValue(throwError(() => new Error('network')));

      component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

      expect(snackBar.open).toHaveBeenCalledTimes(1);
      expect(snackBar.open.mock.calls[0][0]).toBe('Erreur lors du déplacement');
    });
  });

  describe('État vide (AC2)', () => {
    it("affiche le message 'Aucun lien pour l'instant' quand aucune catégorie et pas de chargement", () => {
      linkCategoriesService.isLoading.set(false);
      linkCategoriesService.categories.set([]);
      linkCategoriesService.error.set(null);
      fixture.detectChanges();

      const msg = fixture.nativeElement.querySelector('.empty-message');
      expect(msg?.textContent?.trim()).toBe("Aucun lien pour l'instant");
    });

    it("affiche le bouton CTA 'Ajouter une catégorie' dans l'état vide", () => {
      linkCategoriesService.isLoading.set(false);
      linkCategoriesService.categories.set([]);
      linkCategoriesService.error.set(null);
      fixture.detectChanges();

      const cta = fixture.nativeElement.querySelector('.empty-cta');
      expect(cta).toBeTruthy();
      expect(cta.textContent).toContain('Ajouter une catégorie');
    });

    it('appelle openAddCategoryDialog() quand le bouton CTA est cliqué', () => {
      linkCategoriesService.isLoading.set(false);
      linkCategoriesService.categories.set([]);
      linkCategoriesService.error.set(null);
      fixture.detectChanges();

      const afterClosed$ = new Subject<undefined>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });

      const cta = fixture.nativeElement.querySelector('.empty-cta');
      cta.click();
      afterClosed$.next(undefined);

      expect(dialog.open).toHaveBeenCalled();
    });

    it("n'affiche pas l'état vide quand categories().length > 0", () => {
      linkCategoriesService.isLoading.set(false);
      linkCategoriesService.categories.set([mockCat]);
      linkCategoriesService.error.set(null);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeNull();
    });

    it("n'affiche pas l'état vide pendant le chargement", () => {
      linkCategoriesService.isLoading.set(true);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeNull();
    });

    it("n'affiche pas l'état vide quand error() est défini", () => {
      linkCategoriesService.isLoading.set(false);
      linkCategoriesService.categories.set([]);
      linkCategoriesService.error.set('Erreur de chargement');
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeNull();
    });
  });

  describe('Skeleton screens (AC5)', () => {
    it('affiche 3 skeleton cards pendant le chargement', () => {
      linkCategoriesService.isLoading.set(true);
      fixture.detectChanges();

      const skeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card');
      expect(skeletonCards.length).toBe(3);
    });

    it('masque les skeleton cards après le chargement', () => {
      linkCategoriesService.isLoading.set(false);
      fixture.detectChanges();

      const skeletonCards = fixture.nativeElement.querySelectorAll('.skeleton-card');
      expect(skeletonCards.length).toBe(0);
    });
  });

  describe('Barre de recherche ⌘K (FR50, affordance seule)', () => {
    it('affiche un champ de recherche désactivé en mode lecture', () => {
      linkCategoriesService.categories.set([mockCat]);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('.search-input') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.disabled).toBe(true);
      expect(input.placeholder).toBe('Rechercher un lien, une recette…');
      expect(fixture.nativeElement.querySelector('.search-kbd')?.textContent?.trim()).toBe('⌘K');
    });

    it("n'a aucun gestionnaire d'événement : clic, frappe et ⌘K / Ctrl+K ne font rien", () => {
      linkCategoriesService.categories.set([mockCat]);
      fixture.detectChanges();
      const bar = fixture.debugElement.query(By.css('.search-bar'));
      const input = fixture.debugElement.query(By.css('.search-input'));
      expect(bar.listeners.length).toBe(0);
      expect(input.listeners.length).toBe(0);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      fixture.detectChanges();
      expect(dialog.open).not.toHaveBeenCalled();
      expect(component.editMode()).toBe(false);
    });

    it("n'affiche pas la barre de recherche en mode édition", () => {
      linkCategoriesService.categories.set([mockCat]);
      component.toggleEditMode();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.search-bar')).toBeNull();
    });
  });

  describe('Titre de page', () => {
    const user = { id: 1, username: 'manu@example.com', name: 'Manu' } as unknown as AuthUser;

    it('garde un h1 masqué visuellement pour les lecteurs d’écran', () => {
      TestBed.inject(AuthService).currentUser.set(user);
      fixture.detectChanges();
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.classList).toContain('visually-hidden');
      expect(h1.textContent?.replace(/\s+/g, ' ').trim()).toBe('Dashboard de Manu');
    });

    it("se replie sur l'username quand le nom ne contient que des espaces", () => {
      TestBed.inject(AuthService).currentUser.set({ ...user, name: '  ' });
      fixture.detectChanges();
      const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
      expect(h1.textContent?.replace(/\s+/g, ' ').trim()).toBe('Dashboard de manu@example.com');
    });
  });

  describe('Cascade des cartes', () => {
    it("transmet l'index de chaque carte via --card-index", () => {
      linkCategoriesService.categories.set([mockCat, { ...mockCat, id: 2, name: 'Jeux' }]);
      fixture.detectChanges();
      const cards = fixture.nativeElement.querySelectorAll(
        'app-link-category-card',
      ) as NodeListOf<HTMLElement>;
      expect(cards[0].style.getPropertyValue('--card-index')).toBe('0');
      expect(cards[1].style.getPropertyValue('--card-index')).toBe('1');
    });
  });

  describe('Mode édition Ember (maquette 03-edit)', () => {
    beforeEach(() => {
      linkCategoriesService.categories.set([mockCat]);
    });

    it('affiche la pastille « Mode édition » et un bouton bordé seulement en édition', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.links-edit-mode-badge')).toBeNull();
      expect(fixture.nativeElement.querySelector('.add-category-btn')).toBeNull();

      component.toggleEditMode();
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.links-edit-mode-badge') as HTMLElement;
      expect(badge.textContent?.trim()).toBe('Mode édition');
      expect(badge.getAttribute('role')).toBe('status');
      const addBtn = fixture.nativeElement.querySelector('.add-category-btn') as HTMLElement;
      expect(addBtn.hasAttribute('mat-stroked-button')).toBe(true);
      expect(addBtn.textContent).toContain('Ajouter une catégorie');
    });

    it('le bouton « Ajouter une catégorie » ouvre le dialog de catégorie', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      component.toggleEditMode();
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('.add-category-btn') as HTMLButtonElement).click();
      expect(dialog.open).toHaveBeenCalled();
    });

    it('la grille des catégories reste une grille en édition (orientation mixed)', () => {
      component.toggleEditMode();
      fixture.detectChanges();
      const list = fixture.debugElement.query(By.css('.category-list'));
      expect(list.nativeElement.classList).toContain('cdk-drop-list');
      expect(list.attributes['cdkDropListOrientation']).toBe('mixed');
    });

    it('ouvre les dialogs lien et catégorie en 440px avec la panelClass ember-form-dialog', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
      component.openAddLinkDialog(1);
      component.openEditLinkDialog(mockLink);
      component.openAddCategoryDialog();
      component.openEditCategoryDialog(mockCat);
      for (const call of dialog.open.mock.calls) {
        expect(call[1]).toMatchObject({ width: '440px', panelClass: 'ember-form-dialog' });
      }
      expect(dialog.open).toHaveBeenCalledTimes(4);
    });
  });

  describe('widget ⚙️ (isSmallScreen)', () => {
    it('isSmallScreen est false par défaut (BreakpointObserver retourne false)', () => {
      fixture.detectChanges();
      expect(component.isSmallScreen()).toBe(false);
    });

    it('le bouton ⚙️ est visible en mode lecture et grand écran', () => {
      linkCategoriesService.categories.set([mockCat]);
      fixture.detectChanges();
      const btn = fixture.debugElement.nativeElement.querySelector(
        'button[aria-label="Paramètres d\'affichage"]',
      );
      expect(btn).not.toBeNull();
    });

    it('le bouton ⚙️ est absent en mode édition', () => {
      component.toggleEditMode();
      fixture.detectChanges();
      const btn = fixture.debugElement.nativeElement.querySelector(
        'button[aria-label="Paramètres d\'affichage"]',
      );
      expect(btn).toBeNull();
    });
  });

  describe('adjustColumns()', () => {
    it('incrémente le nombre de colonnes via updateSettings', () => {
      component.adjustColumns(1);
      expect(gridSettingsService.updateSettings).toHaveBeenCalledWith({ columns: 4 });
    });

    it('ne dépasse pas 6 colonnes', () => {
      gridSettingsService.gridSettings.set({
        columns: 6,
        cardWidth: 280,
        gapH: 16,
        gapV: 16,
        linkHeight: 32,
      });
      component.adjustColumns(1);
      expect(gridSettingsService.updateSettings).toHaveBeenCalledWith({ columns: 6 });
    });
  });

  describe('hauteur des liens', () => {
    it('updateLinkHeight() transmet la valeur via updateSettings', () => {
      component.updateLinkHeight(32);
      expect(gridSettingsService.updateSettings).toHaveBeenCalledWith({ linkHeight: 32 });
    });

    it("pose --link-row-height sur l'hôte", () => {
      component.updateLinkHeight(36);
      TestBed.flushEffects();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.style.getPropertyValue('--link-row-height')).toBe('36px');
    });
  });
});
