import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';

@Component({ template: '' })
class BlankComponent {}

describe('FooterComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [
        provideRouter([
          { path: 'share/:token', component: BlankComponent },
          { path: '**', component: BlankComponent },
        ]),
      ],
    }).compileComponents();
  });

  it('affiche la version hors vue publique', async () => {
    await TestBed.inject(Router).navigateByUrl('/recipes');
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-footer')?.textContent).toContain(
      'Dashboard v',
    );
  });

  it('est masqué sur une vue publique /share/* (story 9.6)', async () => {
    await TestBed.inject(Router).navigateByUrl('/share/abc123');
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-footer')).toBeFalsy();
  });
});
