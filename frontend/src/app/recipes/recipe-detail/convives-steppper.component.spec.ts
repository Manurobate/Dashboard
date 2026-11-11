import { TestBed } from '@angular/core/testing';
import { ConvivesSteppperComponent } from './convives-steppper.component';

describe('ConvivesSteppperComponent', () => {
  async function setup(value: number) {
    await TestBed.configureTestingModule({
      imports: [ConvivesSteppperComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConvivesSteppperComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const emitted: number[] = [];
    fixture.componentInstance.valueChange.subscribe((v) => emitted.push(v));
    return { fixture, el, emitted };
  }

  it('expose un spinbutton accessible et affiche « N pers. » (maquette 06)', async () => {
    const { el } = await setup(4);
    const spin = el.querySelector('[role="spinbutton"]')!;
    expect(spin.getAttribute('aria-valuenow')).toBe('4');
    expect(spin.getAttribute('aria-valuemin')).toBe('1');
    expect(spin.getAttribute('aria-label')).toBe('Nombre de convives');
    expect(el.querySelector('.value-number')?.textContent).toBe('4');
    expect(el.querySelector('.value-display')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '4 pers.',
    );
  });

  it('émet la valeur suivante ou précédente', async () => {
    const { el, emitted } = await setup(4);
    (
      el.querySelector('button[aria-label="Augmenter le nombre de convives"]') as HTMLButtonElement
    ).click();
    (
      el.querySelector('button[aria-label="Réduire le nombre de convives"]') as HTMLButtonElement
    ).click();
    expect(emitted).toEqual([5, 3]);
  });

  it('désactive « − » au minimum', async () => {
    const { el, emitted } = await setup(1);
    const minus = el.querySelector(
      'button[aria-label="Réduire le nombre de convives"]',
    ) as HTMLButtonElement;
    expect(minus.disabled).toBe(true);
    minus.click();
    expect(emitted).toEqual([]);
  });
});
