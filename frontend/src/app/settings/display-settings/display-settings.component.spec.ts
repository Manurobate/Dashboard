import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MotionService } from '../../core/services/motion.service';
import { DisplaySettingsComponent } from './display-settings.component';

describe('DisplaySettingsComponent', () => {
  let fixture: ComponentFixture<DisplaySettingsComponent>;
  let el: HTMLElement;
  const enabled = signal(true);
  const motionMock = {
    enabled: enabled.asReadonly(),
    setEnabled: vi.fn((value: boolean) => enabled.set(value)),
  };

  beforeEach(async () => {
    enabled.set(true);
    motionMock.setEnabled.mockClear();
    await TestBed.configureTestingModule({
      imports: [DisplaySettingsComponent],
      providers: [{ provide: MotionService, useValue: motionMock }],
    }).compileComponents();
    fixture = TestBed.createComponent(DisplaySettingsComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  const switchButton = () => el.querySelector('button[role="switch"]') as HTMLButtonElement;

  it('affiche la carte « Affichage » et l’interrupteur « Animations »', () => {
    expect(el.querySelector('h2.settings-card-title')?.textContent?.trim()).toBe('Affichage');
    const button = switchButton();
    expect(button.getAttribute('aria-labelledby')).toBe('animations-label');
    expect(el.querySelector('#animations-label')?.textContent?.trim()).toBe('Animations');
    expect(button.getAttribute('aria-describedby')).toBe('animations-description');
  });

  it('reflète l’état du service', () => {
    expect(switchButton().getAttribute('aria-checked')).toBe('true');
    enabled.set(false);
    fixture.detectChanges();
    expect(switchButton().getAttribute('aria-checked')).toBe('false');
  });

  it('un clic désactive puis réactive les animations', () => {
    switchButton().click();
    fixture.detectChanges();
    expect(motionMock.setEnabled).toHaveBeenLastCalledWith(false);
    switchButton().click();
    fixture.detectChanges();
    expect(motionMock.setEnabled).toHaveBeenLastCalledWith(true);
  });

  it('le libellé visible est relié au bouton (clic sur le libellé)', () => {
    const label = el.querySelector('#animations-label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(switchButton().id);
  });
});
