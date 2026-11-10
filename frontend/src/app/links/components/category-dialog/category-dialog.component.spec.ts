import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { CategoryDialogComponent, CategoryDialogData } from './category-dialog.component';
import { LinkCategory } from '../../link-categories.service';

const mockCat: LinkCategory = {
  id: 1,
  name: 'Dev',
  icon: 'home',
  position: 0,
  userId: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CategoryDialogComponent', () => {
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  async function setup(data: CategoryDialogData = {}) {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CategoryDialogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CategoryDialogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  it('relie le label « Nom » requis à son champ (maquette 19)', async () => {
    const { fixture } = await setup();
    const label = fixture.debugElement.query(By.css('label.field-label'))
      .nativeElement as HTMLLabelElement;
    expect(label.textContent?.replace('*', '').trim()).toBe('Nom');
    expect(label.querySelector('.field-required')).toBeTruthy();
    const input = fixture.nativeElement.querySelector(`#${label.htmlFor}`) as HTMLInputElement;
    expect(input.getAttribute('aria-required')).toBe('true');
    expect(fixture.debugElement.query(By.css('mat-label'))).toBeNull();
  });

  it('sans icône : « Aucune icône » et bouton « Choisir une icône » à icône image', async () => {
    const { fixture } = await setup();
    expect(fixture.debugElement.query(By.css('.field-hint')).nativeElement.textContent).toBe(
      '(optionnelle)',
    );
    expect(fixture.debugElement.query(By.css('.no-icon-label'))).toBeTruthy();
    const btn = fixture.debugElement.query(By.css('.choose-icon-btn'))
      .nativeElement as HTMLButtonElement;
    expect(btn.textContent).toContain('Choisir une icône');
    expect(btn.querySelector('mat-icon')?.textContent?.trim()).toBe('image');
  });

  it('avec icône : aperçu .icon-preview, nom et bouton « Changer »', async () => {
    const { fixture } = await setup({ category: mockCat });
    expect(fixture.debugElement.query(By.css('.icon-preview')).nativeElement.textContent).toContain(
      'home',
    );
    expect(fixture.debugElement.query(By.css('.icon-name')).nativeElement.textContent).toBe('home');
    expect(
      fixture.debugElement.query(By.css('.choose-icon-btn')).nativeElement.textContent,
    ).toContain('Changer');
  });

  it('garde les validations du nom (requis, 255 caractères)', async () => {
    const { fixture, component } = await setup();
    const confirm = fixture.debugElement.query(By.css('.dialog-primary-action'))
      .nativeElement as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    component.form.patchValue({ name: 'Dev' });
    fixture.detectChanges();
    expect(confirm.disabled).toBe(false);
    component.form.patchValue({ name: 'x'.repeat(256) });
    expect(component.form.get('name')?.hasError('maxlength')).toBe(true);
  });

  it('ouvre le sélecteur en 480px avec la panelClass ember-form-dialog', async () => {
    const { component } = await setup();
    const open = vi
      .spyOn((component as unknown as { dialog: MatDialog }).dialog, 'open')
      .mockReturnValue({ afterClosed: () => of(undefined) } as never);
    component.openIconPicker();
    expect(open.mock.calls[0][1]).toMatchObject({
      width: '480px',
      panelClass: 'ember-form-dialog',
    });
  });
});
