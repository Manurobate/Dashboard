import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { NEVER, of, throwError } from 'rxjs';

registerLocaleData(localeFr, 'fr');
import { ShareViewComponent } from './share-view.component';
import { SharingService, PublicRecipeView } from '../../../shared/services/sharing.service';
import { ThemeService } from '../../../core/services/theme.service';

const mockRecipe: PublicRecipeView = {
  title: 'Tarte aux pommes',
  avantPropos: 'Un délice de grand-mère',
  imageUrl: null,
  servings: 4,
  ingredients: [{ quantity: 200, unit: 'g', name: 'Farine', position: 0 }],
  steps: [{ content: 'Cuire 30 minutes', position: 0 }],
  sharedBy: 'Manu',
};

describe('ShareViewComponent', () => {
  let sharingService: { getPublicRecipe: ReturnType<typeof vi.fn> };
  let themeService: {
    isDark: ReturnType<typeof vi.fn>;
    forceLight: ReturnType<typeof vi.fn>;
    restorePreference: ReturnType<typeof vi.fn>;
  };
  let metaSpy: { addTag: ReturnType<typeof vi.fn>; removeTag: ReturnType<typeof vi.fn> };

  async function setup(token: string | null = 'abc123') {
    document.body.classList.remove('dark-theme');

    const activatedRoute = {
      snapshot: { paramMap: convertToParamMap({ token }) },
    };

    await TestBed.configureTestingModule({
      imports: [ShareViewComponent],
      providers: [
        { provide: SharingService, useValue: sharingService },
        { provide: ThemeService, useValue: themeService },
        { provide: Meta, useValue: metaSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ShareViewComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  }

  beforeEach(() => {
    sharingService = { getPublicRecipe: vi.fn().mockReturnValue(of(mockRecipe)) };
    themeService = {
      isDark: vi.fn().mockReturnValue(false),
      forceLight: vi.fn(),
      restorePreference: vi.fn(),
    };
    metaSpy = { addTag: vi.fn(), removeTag: vi.fn() };
  });

  it('charge la recette publique et affiche le titre et les ingrédients', async () => {
    const { component } = await setup();
    expect(sharingService.getPublicRecipe).toHaveBeenCalledWith('abc123');
    expect(component.isLoading()).toBe(false);
    expect(component.recipe()).toEqual(mockRecipe);
  });

  it('recalcule computedIngredients quand currentServings change (AC2)', async () => {
    const { component } = await setup();
    expect(component.computedIngredients()).toEqual([
      { quantity: 200, unit: 'g', name: 'Farine', position: 0 },
    ]);
    component.onServingsChange(8);
    expect(component.computedIngredients()).toEqual([
      { quantity: 400, unit: 'g', name: 'Farine', position: 0 },
    ]);
  });

  it('affiche la section avant-propos quand elle est présente et la masque quand absente (AC4)', async () => {
    const { fixture } = await setup();
    let el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.avant-propos-section')).toBeTruthy();

    sharingService.getPublicRecipe = vi
      .fn()
      .mockReturnValue(of({ ...mockRecipe, avantPropos: null }));
    TestBed.resetTestingModule();
    const { fixture: fixture2 } = await setup();
    el = fixture2.nativeElement;
    expect(el.querySelector('.avant-propos-section')).toBeFalsy();
  });

  it('passe en état erreur neutre "gone" quand getPublicRecipe échoue (404)', async () => {
    sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status: 404 })));
    const { component, fixture } = await setup('xxxx');
    expect(component.error()).toBe('gone');
    expect(component.isLoading()).toBe(false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Ce lien a expiré ou n'est plus disponible.");
  });

  it.each([[500], [429], [0]])(
    'passe en état erreur "transient" avec bouton Réessayer quand getPublicRecipe échoue (status %i)',
    async (status) => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status })));
      const { component, fixture } = await setup('xxxx');
      expect(component.error()).toBe('transient');
      expect(component.isLoading()).toBe(false);
      const el: HTMLElement = fixture.nativeElement;
      expect(el.textContent).toContain(
        'Une erreur est survenue. Réessayez dans quelques instants.',
      );
      expect(el.textContent).toContain('Réessayer');
    },
  );

  it('passe en état erreur "gone" quand le token est absent de l\'URL', async () => {
    const { component, fixture } = await setup(null);
    expect(component.error()).toBe('gone');
    expect(component.isLoading()).toBe(false);
    expect(sharingService.getPublicRecipe).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Ce lien a expiré ou n'est plus disponible.");
  });

  it('recharge la recette via load() après une erreur transitoire (AC4 retry)', async () => {
    sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
    const { component, fixture } = await setup('xxxx');
    expect(component.error()).toBe('transient');

    sharingService.getPublicRecipe = vi.fn().mockReturnValue(of(mockRecipe));
    component.load();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.recipe()).toEqual(mockRecipe);
    expect(component.isLoading()).toBe(false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.recipe-title')?.textContent).toContain(mockRecipe.title);
    expect(el.querySelector('.error-state')).toBeFalsy();
  });

  it('force le thème clair sans le mémoriser à la création (Q4, story 9.6)', async () => {
    await setup();
    expect(themeService.forceLight).toHaveBeenCalledTimes(1);
    expect(themeService.restorePreference).not.toHaveBeenCalled();
  });

  it('réapplique la préférence mémorisée à la destruction (Q4, story 9.6)', async () => {
    const { component } = await setup();
    component.ngOnDestroy();
    expect(themeService.restorePreference).toHaveBeenCalledTimes(1);
  });

  it('ajoute le meta robots=noindex à la création et le retire à la destruction (AC3)', async () => {
    const { component } = await setup();
    expect(metaSpy.addTag).toHaveBeenCalledWith({ name: 'robots', content: 'noindex' });
    component.ngOnDestroy();
    expect(metaSpy.removeTag).toHaveBeenCalledWith("name='robots'");
  });

  describe('rendu Ember (story 9.6, maquettes 11 et 12)', () => {
    it('affiche les cartes convives, ingrédients et préparation, et le pied « Partagé via Dashboard »', async () => {
      const { fixture } = await setup();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.share-view.recipe-sheet')).toBeTruthy();
      expect(el.querySelector('.servings-card .servings-count')?.textContent).toBe('4');
      expect(el.querySelector('.servings-label')?.textContent).toContain('personnes');
      expect(el.querySelector('.ingredient-item .quantity')?.textContent).toBe('200');
      expect(el.querySelector('.ingredient-item .unit')?.textContent).toBe('g');
      expect(el.querySelector('.steps-section')?.getAttribute('aria-label')).toBe('Préparation');
      expect(el.querySelector('.step-number')?.textContent).toBe('1');
      expect(el.querySelector('.shared-via')?.textContent?.trim()).toBe(
        'Partagé par Manu via Dashboard',
      );
      expect(el.querySelector('.recipe-image')).toBeFalsy();
    });

    it('« Dashboard » du pied est un lien externe vers le dépôt GitHub', async () => {
      const { fixture } = await setup();
      const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.shared-via a');
      expect(link.textContent).toBe('Dashboard');
      expect(link.getAttribute('href')).toBe('https://github.com/Manurobate/Dashboard');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });

    it('pied « Partagé via Dashboard » sans nom de propriétaire', async () => {
      sharingService.getPublicRecipe = vi
        .fn()
        .mockReturnValue(of({ ...mockRecipe, sharedBy: null }));
      const { fixture } = await setup();
      expect(fixture.nativeElement.querySelector('.shared-via')?.textContent?.trim()).toBe(
        'Partagé via Dashboard',
      );
    });

    it("n'expose aucun lien de navigation interne", async () => {
      const { fixture } = await setup();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelectorAll('a[href^="/"]').length).toBe(0);
    });

    it('accorde « personne » au singulier', async () => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(of({ ...mockRecipe, servings: 1 }));
      const { fixture } = await setup();
      const label = fixture.nativeElement.querySelector('.servings-label')?.textContent ?? '';
      expect(label).toContain('personne');
      expect(label).not.toContain('personnes');
    });

    it('affiche « Aucune étape renseignée. » dans la carte Préparation sans étapes', async () => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(of({ ...mockRecipe, steps: [] }));
      const { fixture } = await setup();
      const steps: HTMLElement = fixture.nativeElement.querySelector('.steps-section');
      expect(steps.textContent).toContain('Aucune étape renseignée.');
    });

    it('affiche des squelettes pendant le chargement', async () => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(NEVER);
      const { fixture } = await setup();
      const loading: HTMLElement = fixture.nativeElement.querySelector('.loading-state');
      expect(loading.getAttribute('aria-busy')).toBe('true');
      expect(loading.querySelectorAll('.skeleton-line').length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('mat-spinner')).toBeFalsy();
    });

    it('lien invalide : tuile, titre et paragraphe de la maquette 12', async () => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status: 404 })));
      const { fixture } = await setup('xxxx');
      const state: HTMLElement = fixture.nativeElement.querySelector('.error-state--gone');
      expect(state.querySelector('.error-tile svg')).toBeTruthy();
      expect(state.querySelector('h1')?.textContent).toBe(
        "Ce lien a expiré ou n'est plus disponible.",
      );
      expect(state.querySelector('p')?.textContent).toContain(
        "Demandez à la personne qui vous l'a envoyé de vous en partager un nouveau.",
      );
    });

    it('erreur transitoire : « Réessayer » relance le chargement', async () => {
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status: 500 })));
      const { fixture } = await setup('xxxx');
      sharingService.getPublicRecipe = vi.fn().mockReturnValue(of(mockRecipe));
      const retry: HTMLButtonElement = fixture.nativeElement.querySelector('.retry-btn');
      expect(
        fixture.nativeElement.querySelector('.error-state--transient .error-tile'),
      ).toBeTruthy();
      retry.click();
      fixture.detectChanges();
      expect(sharingService.getPublicRecipe).toHaveBeenCalledWith('xxxx');
      expect(fixture.nativeElement.querySelector('.recipe-title')?.textContent).toContain(
        mockRecipe.title,
      );
    });
  });
});
