import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { LinksComponent } from './links.component';
import { LinkCategoriesService, LinkCategory } from './link-categories.service';

const mockCat: LinkCategory = {
  id: 1,
  name: 'Dev',
  emoji: '💻',
  position: 0,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('LinksComponent', () => {
  let component: LinksComponent;
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
  let dialog: { open: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

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
    dialog = { open: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LinksComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: LinkCategoriesService, useValue: linkCategoriesService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LinksComponent);
    component = fixture.componentInstance;
  });

  it('appelle loadCategories au démarrage', () => {
    component.ngOnInit();
    expect(linkCategoriesService.loadCategories).toHaveBeenCalled();
  });

  describe('openAddCategoryDialog()', () => {
    it('ouvre CategoryDialogComponent et crée la catégorie si confirmé', () => {
      const afterClosed$ = new Subject<{ name: string; emoji?: string }>();
      dialog.open.mockReturnValue({ afterClosed: () => afterClosed$ });
      linkCategoriesService.createCategory.mockReturnValue(of(mockCat));

      component.openAddCategoryDialog();
      afterClosed$.next({ name: 'Dev', emoji: '💻' });

      expect(linkCategoriesService.createCategory).toHaveBeenCalledWith('Dev', '💻');
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

      expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la création', 'Fermer', { duration: 4000 });
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
      expect(snackBar.open).toHaveBeenCalledWith('Catégorie mise à jour', 'Fermer', { duration: 3000 });
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
      expect(snackBar.open).toHaveBeenCalledWith('Catégorie supprimée', 'Fermer', { duration: 3000 });
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

      // Déplace l'item d'index 0 vers index 1 → [cat2, mockCat]
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
      expect(snackBar.open).toHaveBeenCalledWith(
        'Erreur lors de la réorganisation',
        'Fermer',
        { duration: 3000 },
      );
    });
  });
});
