import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import {
  MaterialIconPickerComponent,
  MaterialIcon,
  IconPickerDialogData,
} from './material-icon-picker.component';

const mockIcons: MaterialIcon[] = [
  { name: 'home', label: 'Maison' },
  { name: 'star', label: 'Étoile' },
  { name: 'favorite', label: 'Favori' },
  { name: 'calendar_today', label: 'Calendrier' },
  { name: 'link', label: 'Lien' },
];

describe('MaterialIconPickerComponent', () => {
  let httpMock: HttpTestingController;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  async function setup(currentIcon: string | null = null, failHttp = false) {
    dialogRefSpy = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [MaterialIconPickerComponent],
      providers: [
        provideAnimationsAsync(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRefSpy },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { currentIcon } satisfies IconPickerDialogData,
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(MaterialIconPickerComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    // Répondre à la requête HTTP pour charger les icônes
    const req = httpMock.expectOne('/material-icons.json');
    if (failHttp) {
      req.error(new ErrorEvent('network error'));
    } else {
      req.flush(mockIcons);
    }
    fixture.detectChanges();

    return { fixture, component };
  }

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  describe('initialisation', () => {
    it('charge les icônes depuis /material-icons.json', async () => {
      const { component } = await setup();
      expect(component.allIcons()).toEqual(mockIcons);
    });

    it('initialise selectedIcon depuis les données du dialog', async () => {
      const { component } = await setup('home');
      expect(component.selectedIcon()).toBe('home');
    });

    it('initialise selectedIcon à null si aucune icône courante', async () => {
      const { component } = await setup(null);
      expect(component.selectedIcon()).toBeNull();
    });

    it('affiche toutes les icônes sans terme de recherche', async () => {
      const { component } = await setup();
      expect(component.filteredIcons()).toHaveLength(mockIcons.length);
    });

    it('isLoading passe à false après chargement réussi', async () => {
      const { component } = await setup();
      expect(component.isLoading()).toBe(false);
      expect(component.loadError()).toBe(false);
    });

    it('loadError passe à true et isLoading reste false si la requête échoue', async () => {
      const { component } = await setup(null, true);
      expect(component.loadError()).toBe(true);
      expect(component.isLoading()).toBe(false);
      expect(component.allIcons()).toHaveLength(0);
    });
  });

  describe("recherche d'icônes avec debounce", () => {
    it('filtre les icônes par nom après le debounce', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('home');
      vi.advanceTimersByTime(200); // debounce 150ms
      expect(component.filteredIcons()).toHaveLength(1);
      expect(component.filteredIcons()[0].name).toBe('home');
    });

    it('filtre les icônes par nom de façon insensible à la casse', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('HOME');
      vi.advanceTimersByTime(200);
      expect(component.filteredIcons()).toHaveLength(1);
      expect(component.filteredIcons()[0].name).toBe('home');
    });

    it('filtre les icônes par label (insensible à la casse)', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('étoile');
      vi.advanceTimersByTime(200);
      expect(component.filteredIcons()).toHaveLength(1);
      expect(component.filteredIcons()[0].name).toBe('star');
    });

    it('retourne une liste vide si aucun résultat', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('xyznonexistent123');
      vi.advanceTimersByTime(200);
      expect(component.filteredIcons()).toHaveLength(0);
    });

    it('retourne toutes les icônes si la recherche est effacée', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('home');
      vi.advanceTimersByTime(200);
      component.onSearchChange('');
      vi.advanceTimersByTime(200);
      expect(component.filteredIcons()).toHaveLength(mockIcons.length);
    });

    it('applique le debounce : searchTerm non mis à jour avant 150ms', async () => {
      vi.useFakeTimers();
      const { component } = await setup();
      component.onSearchChange('home');
      vi.advanceTimersByTime(100); // pas encore appliqué
      expect(component.searchTerm()).toBe('');
      vi.advanceTimersByTime(60); // 160ms total → appliqué
      expect(component.searchTerm()).toBe('home');
    });
  });

  describe("sélection d'icône", () => {
    it('select() met à jour selectedIcon', async () => {
      const { component } = await setup();
      component.select('star');
      expect(component.selectedIcon()).toBe('star');
    });

    it('select() remplace la sélection précédente', async () => {
      const { component } = await setup('home');
      component.select('star');
      expect(component.selectedIcon()).toBe('star');
    });
  });

  describe('actions du dialog', () => {
    it("confirm() ferme le dialog avec l'icône sélectionnée", async () => {
      const { component } = await setup('home');
      component.confirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith('home');
    });

    it('confirm() ferme le dialog avec null si aucune sélection', async () => {
      const { component } = await setup(null);
      component.confirm();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('clear() ferme le dialog avec null', async () => {
      const { component } = await setup('home');
      component.clear();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
    });

    it('cancel() ferme le dialog avec undefined', async () => {
      const { component } = await setup('home');
      component.cancel();
      expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
    });
  });

  describe('template', () => {
    it("affiche la prévisualisation de l'icône sélectionnée", async () => {
      const { fixture, component } = await setup('star');
      const preview = fixture.debugElement.query(By.css('.selected-preview'));
      expect(preview).toBeTruthy();
      const icon = preview.query(By.css('mat-icon'));
      expect(icon.nativeElement.textContent.trim()).toBe('star');
    });

    it("n'affiche pas la prévisualisation si aucune sélection", async () => {
      const { fixture } = await setup(null);
      const preview = fixture.debugElement.query(By.css('.selected-preview'));
      expect(preview).toBeNull();
    });

    it('affiche le message "Aucune icône" si la recherche ne donne aucun résultat', async () => {
      vi.useFakeTimers();
      const { fixture, component } = await setup();
      component.onSearchChange('xyznonexistent123');
      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      const noResult = fixture.debugElement.query(By.css('.no-result'));
      expect(noResult).toBeTruthy();
    });
  });
});
