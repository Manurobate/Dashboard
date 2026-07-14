import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ShareLinkDialogComponent, ShareLinkDialogData } from './share-link-dialog.component';
import { SharingService, PublicShareToken } from '../../services/sharing.service';

const mockToken: PublicShareToken = {
  id: 100,
  token: 'abc123',
  resourceType: 'recipe',
  resourceId: 1,
  userId: 42,
  expiresAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-07-13T00:00:00.000Z',
  revokedAt: null,
};

const dialogData: ShareLinkDialogData = {
  resourceType: 'recipe',
  resourceId: 1,
  resourceLabel: 'Tarte aux pommes',
};

describe('ShareLinkDialogComponent', () => {
  let sharingService: {
    findActiveForResource: ReturnType<typeof vi.fn>;
    createShareLink: ReturnType<typeof vi.fn>;
    revokeShareLink: ReturnType<typeof vi.fn>;
    buildShareUrl: ReturnType<typeof vi.fn>;
  };
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };
  let dialogSpy: { open: ReturnType<typeof vi.fn> };
  let snackBarSpy: { open: ReturnType<typeof vi.fn> };
  let writeTextSpy: ReturnType<typeof vi.fn>;

  async function setup() {
    sharingService = {
      findActiveForResource: vi.fn().mockReturnValue(of([])),
      createShareLink: vi.fn().mockReturnValue(of(mockToken)),
      revokeShareLink: vi.fn().mockReturnValue(of({ ...mockToken, revokedAt: 'x' })),
      buildShareUrl: vi.fn().mockImplementation((t: string) => `http://localhost/share/${t}`),
    };
    dialogRefSpy = { close: vi.fn() };
    dialogSpy = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    snackBarSpy = { open: vi.fn() };
    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextSpy },
    });

    await TestBed.configureTestingModule({
      imports: [ShareLinkDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: SharingService, useValue: sharingService },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ShareLinkDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, component };
  }

  it("démarre en état idle quand aucun token actif n'existe", async () => {
    const { component } = await setup();
    expect(component.state()).toBe('idle');
    expect(sharingService.findActiveForResource).toHaveBeenCalledWith('recipe', 1);
  });

  it('démarre en état link-ready si un token actif existe déjà', async () => {
    sharingService = {
      findActiveForResource: vi.fn().mockReturnValue(of([mockToken])),
      createShareLink: vi.fn(),
      revokeShareLink: vi.fn(),
      buildShareUrl: vi.fn().mockReturnValue('http://localhost/share/abc123'),
    };
    dialogRefSpy = { close: vi.fn() };
    dialogSpy = { open: vi.fn() };
    snackBarSpy = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ShareLinkDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: SharingService, useValue: sharingService },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShareLinkDialogComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.state()).toBe('link-ready');
    expect(component.currentToken()).toEqual(mockToken);
    expect(component.shareUrl()).toBe('http://localhost/share/abc123');
  });

  it('generate() passe en link-ready, copie le lien et affiche un snackbar', async () => {
    const { component } = await setup();
    component.generate();
    expect(sharingService.createShareLink).toHaveBeenCalledWith('recipe', 1, '7d');
    expect(component.state()).toBe('link-ready');
    expect(writeTextSpy).toHaveBeenCalledWith('http://localhost/share/abc123');
    // Le snackbar de succès dépend de la résolution de la copie (asynchrone)
    await new Promise((r) => setTimeout(r));
    expect(snackBarSpy.open).toHaveBeenCalledWith('Lien copié ✓', undefined, { duration: 3000 });
  });

  it('generate() n\'affiche pas "Lien copié" trompeur si le presse-papier est indisponible', async () => {
    const { component } = await setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    component.generate();
    expect(component.state()).toBe('link-ready');
    await new Promise((r) => setTimeout(r));
    expect(snackBarSpy.open).not.toHaveBeenCalledWith('Lien copié ✓', undefined, {
      duration: 3000,
    });
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Lien généré — copiez-le manuellement',
      'Fermer',
      { duration: 4000 },
    );
  });

  it('generate() revient en idle et affiche une erreur si la requête échoue', async () => {
    const { component } = await setup();
    sharingService.createShareLink.mockReturnValue(throwError(() => new Error('boom')));
    component.generate();
    expect(component.state()).toBe('idle');
    expect(snackBarSpy.open).toHaveBeenCalledWith('Impossible de générer le lien', 'Fermer', {
      duration: 4000,
    });
  });

  it('generate() sur conflit 409 réaffiche le lien existant sans doublon', async () => {
    const { component } = await setup();
    sharingService.createShareLink.mockReturnValue(throwError(() => ({ status: 409 })));
    sharingService.findActiveForResource.mockReturnValue(of([mockToken]));
    component.generate();
    expect(component.state()).toBe('link-ready');
    expect(component.currentToken()).toEqual(mockToken);
    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'Un lien actif existe déjà pour cette recette',
      'Fermer',
      { duration: 4000 },
    );
  });

  it('regenerate() confirmé révoque le lien et repasse en idle', async () => {
    const { component } = await setup();
    vi.spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as ReturnType<MatDialog['open']>);
    component.currentToken.set(mockToken);
    component.state.set('link-ready');
    component.regenerate();
    expect(sharingService.revokeShareLink).toHaveBeenCalledWith(100);
    expect(component.state()).toBe('idle');
    expect(component.currentToken()).toBeNull();
  });

  it('revoke() confirmé passe en état revoked', async () => {
    const { component } = await setup();
    const openSpy = vi
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);
    component.currentToken.set(mockToken);
    component.state.set('link-ready');
    component.revoke();
    expect(openSpy).toHaveBeenCalled();
    expect(sharingService.revokeShareLink).toHaveBeenCalledWith(100);
    expect(component.state()).toBe('revoked');
  });

  it("revoke() annulé ne change pas l'état", async () => {
    const { component } = await setup();
    vi.spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open').mockReturnValue({
      afterClosed: () => of(false),
    } as ReturnType<MatDialog['open']>);
    component.currentToken.set(mockToken);
    component.state.set('link-ready');
    component.revoke();
    expect(sharingService.revokeShareLink).not.toHaveBeenCalled();
    expect(component.state()).toBe('link-ready');
  });

  it('close() ferme le dialog', async () => {
    const { component } = await setup();
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});
