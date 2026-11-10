import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService, AuthUser } from './core/services/auth.service';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render top-bar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-top-bar')).toBeTruthy();
  });

  it('should render bottom-nav', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-bottom-nav')).toBeTruthy();
  });

  describe('titre de la fenêtre', () => {
    const user = { id: 1, username: 'manu@example.com', name: 'Manu' } as unknown as AuthUser;

    it('vaut « Dashboard » sans utilisateur connecté', async () => {
      const fixture = TestBed.createComponent(App);
      TestBed.inject(AuthService).currentUser.set(null);
      await fixture.whenStable();
      expect(TestBed.inject(Title).getTitle()).toBe('Dashboard');
    });

    it('vaut « Dashboard de {nom} » une fois connecté', async () => {
      const fixture = TestBed.createComponent(App);
      TestBed.inject(AuthService).currentUser.set(user);
      await fixture.whenStable();
      expect(TestBed.inject(Title).getTitle()).toBe('Dashboard de Manu');
    });

    it("se replie sur l'username quand le nom est vide", async () => {
      const fixture = TestBed.createComponent(App);
      TestBed.inject(AuthService).currentUser.set({ ...user, name: '  ' });
      await fixture.whenStable();
      expect(TestBed.inject(Title).getTitle()).toBe('Dashboard de manu@example.com');
    });

    it('revient à « Dashboard » après déconnexion', async () => {
      const fixture = TestBed.createComponent(App);
      const auth = TestBed.inject(AuthService);
      auth.currentUser.set(user);
      await fixture.whenStable();
      auth.currentUser.set(null);
      await fixture.whenStable();
      expect(TestBed.inject(Title).getTitle()).toBe('Dashboard');
    });
  });
});
