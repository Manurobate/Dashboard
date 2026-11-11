import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { RecipeEditorComponent } from './recipe-editor.component';
import { RecipesService } from '../recipes.service';

describe('RecipeEditorComponent', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [RecipeEditorComponent],
      providers: [
        provideRouter([]),
        provideAnimationsAsync(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        {
          provide: RecipesService,
          useValue: {
            getCategories: vi.fn().mockReturnValue(of([{ id: 1, name: 'Plats' }])),
            getIngredientSuggestions: vi.fn().mockReturnValue(of([])),
            getUnitSuggestions: vi.fn().mockReturnValue(of([])),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecipeEditorComponent);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      el: fixture.nativeElement as HTMLElement,
    };
  }

  it('relie chaque label à un champ unique, sans mat-label (maquette 17)', async () => {
    const { el } = await setup();
    const labels = Array.from(el.querySelectorAll('label.field-label')) as HTMLLabelElement[];
    const ids = labels.map((l) => l.htmlFor);
    expect(new Set(ids).size).toBe(ids.length);
    for (const label of labels) {
      const field = el.querySelector(`#${label.htmlFor}`) as HTMLInputElement;
      expect(field).toBeInstanceOf(HTMLInputElement);
      expect(Array.from(field.labels ?? [])).toContain(label);
    }
    expect(el.querySelector('mat-label')).toBeNull();
    // 4 champs principaux + 3 lignes d'ingrédients × 3 champs
    expect(labels).toHaveLength(13);
  });

  it('marque les champs requis d’un astérisque', async () => {
    const { el } = await setup();
    const required = Array.from(el.querySelectorAll('label.field-label'))
      .filter((l) => l.querySelector('.field-required'))
      .map((l) => l.textContent?.replace('*', '').trim());
    expect(required.slice(0, 3)).toEqual(['Titre', 'Catégorie', 'Convives']);
    expect(required.filter((t) => t === 'Qté')).toHaveLength(3);
    expect(required.filter((t) => t === 'Ingrédient')).toHaveLength(3);
    expect(required).not.toContain('Unité');
    expect(required).not.toContain('Image URL');
  });

  it('affiche l’erreur actuelle quand le titre requis est vidé', async () => {
    const { fixture, el } = await setup();
    const input = el.querySelector('#recipe-title') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.closest('mat-form-field')?.querySelector('mat-error')?.textContent).toContain(
      'Le titre est obligatoire',
    );
  });

  it('garde l’autocomplétion de la catégorie avec une flèche de liste déroulante', async () => {
    const { el } = await setup();
    const input = el.querySelector('#recipe-category') as HTMLInputElement;
    expect(input.getAttribute('formcontrolname')).toBe('category');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    const field = input.closest('mat-form-field')!;
    expect(field.querySelector('[matsuffix]')?.textContent).toContain('expand_more');
  });

  it('accepte une catégorie libre (création à la volée)', async () => {
    const { component } = await setup();
    component.form.controls.category.setValue('Nouvelle catégorie');
    expect(component.form.controls.category.valid).toBe(true);
  });

  it('n’utilise plus color="warn" et numérote les étapes', async () => {
    const { el } = await setup();
    expect(el.querySelector('[color="warn"]')).toBeNull();
    expect(el.querySelector('.step-row .step-number')?.textContent?.trim()).toBe('1');
    expect(el.querySelector('section.section-steps textarea.mle-textarea')).toBeTruthy();
  });

  it('affiche « Ajouter un ingrédient » et « Ajouter une étape » en boutons bordés', async () => {
    const { el } = await setup();
    const adds = Array.from(el.querySelectorAll('.btn-add')).map((b) => b.textContent?.trim());
    expect(adds).toEqual(['add Ajouter un ingrédient', 'add Ajouter une étape']);
  });
});
