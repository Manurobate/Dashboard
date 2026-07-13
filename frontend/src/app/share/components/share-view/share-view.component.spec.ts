import { TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

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
};

describe('ShareViewComponent', () => {
  let sharingService: { getPublicRecipe: ReturnType<typeof vi.fn> };
  let themeService: { isDark: ReturnType<typeof vi.fn> };
  let metaSpy: { addTag: ReturnType<typeof vi.fn>; removeTag: ReturnType<typeof vi.fn> };

  async function setup(token = 'abc123') {
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
    themeService = { isDark: vi.fn().mockReturnValue(false) };
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

  it('passe en état erreur neutre quand getPublicRecipe échoue (404)', async () => {
    sharingService.getPublicRecipe = vi.fn().mockReturnValue(throwError(() => ({ status: 404 })));
    const { component, fixture } = await setup('xxxx');
    expect(component.hasError()).toBe(true);
    expect(component.isLoading()).toBe(false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Ce lien n'est plus disponible");
  });

  it('force le thème clair au chargement même si ThemeService.isDark() est true (AC5)', async () => {
    document.body.classList.add('dark-theme');
    themeService.isDark.mockReturnValue(true);
    await setup();
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('restaure le thème sombre à la destruction si isDark() était true (AC5)', async () => {
    themeService.isDark.mockReturnValue(true);
    const { component } = await setup();
    component.ngOnDestroy();
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    document.body.classList.remove('dark-theme');
  });

  it('ajoute le meta robots=noindex à la création et le retire à la destruction (AC3)', async () => {
    const { component } = await setup();
    expect(metaSpy.addTag).toHaveBeenCalledWith({ name: 'robots', content: 'noindex' });
    component.ngOnDestroy();
    expect(metaSpy.removeTag).toHaveBeenCalledWith("name='robots'");
  });
});
