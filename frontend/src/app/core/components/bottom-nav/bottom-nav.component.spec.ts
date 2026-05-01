import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { routes } from '../../../app.routes';

describe('BottomNavComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNavComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render 3 navigation items', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.bottom-nav-item');
    expect(items.length).toBe(3);
  });

  it('should have aria-label on each nav link', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('a.bottom-nav-item');
    items.forEach(item => {
      expect(item.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('should navigate to /links, /recipes, /notes', async () => {
    const fixture = TestBed.createComponent(BottomNavComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('a.bottom-nav-item');
    expect(links[0].getAttribute('href')).toContain('/links');
    expect(links[1].getAttribute('href')).toContain('/recipes');
    expect(links[2].getAttribute('href')).toContain('/notes');
  });
});
