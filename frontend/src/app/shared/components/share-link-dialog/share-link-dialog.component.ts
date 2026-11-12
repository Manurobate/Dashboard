import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
  MatDialog,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SharingService,
  ShareResourceType,
  ShareExpiresIn,
  PublicShareToken,
} from '../../services/sharing.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../confirm-dialog/confirm-dialog.component';

export interface ShareLinkDialogData {
  resourceType: ShareResourceType;
  resourceId: number;
  resourceLabel: string;
}

type DialogState = 'idle' | 'generating' | 'link-ready' | 'revoked';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const DIALOG_TITLES: Record<ShareResourceType, string> = {
  recipe: 'Partager la recette',
};

/**
 * Durée restante d'un lien, en jours (arrondis) au-delà de 24 heures, en heures
 * en dessous, « moins d'une heure » sous l'heure (maquette 10).
 */
export function describeExpiry(expiresAt: string | null, now = Date.now()): string {
  if (expiresAt === null) return 'permanent';
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining < HOUR_MS) return "expire dans moins d'une heure";
  const hours = Math.round(remaining / HOUR_MS);
  if (hours < 24) return `expire dans ${hours} ${hours > 1 ? 'heures' : 'heure'}`;
  const days = Math.round(remaining / DAY_MS);
  return `expire dans ${days} ${days > 1 ? 'jours' : 'jour'}`;
}

interface ExpiresOption {
  value: ShareExpiresIn;
  label: string;
}

@Component({
  selector: 'app-share-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './share-link-dialog.component.html',
  styleUrl: './share-link-dialog.component.scss',
})
export class ShareLinkDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ShareLinkDialogComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly sharingService = inject(SharingService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<ShareLinkDialogData>(MAT_DIALOG_DATA);

  readonly expiresOptions: ExpiresOption[] = [
    { value: '24h', label: '24 heures' },
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: 'permanent', label: 'Permanent' },
  ];

  readonly state = signal<DialogState>('idle');
  readonly selectedExpiresIn = signal<ShareExpiresIn>('7d');
  readonly currentToken = signal<PublicShareToken | null>(null);
  readonly dialogTitle = DIALOG_TITLES[this.data.resourceType] ?? 'Partager';
  readonly linkLabel = computed(
    () => `Lien public (${describeExpiry(this.currentToken()?.expiresAt ?? null)})`,
  );
  readonly shareUrl = computed(() => {
    const token = this.currentToken();
    return token ? this.sharingService.buildShareUrl(token.token) : '';
  });

  ngOnInit(): void {
    this.loadActiveLink();
  }

  onExpiresInChange(value: ShareExpiresIn): void {
    this.selectedExpiresIn.set(value);
  }

  generate(): void {
    this.state.set('generating');
    this.createLink();
  }

  private createLink(): void {
    this.sharingService
      .createShareLink(this.data.resourceType, this.data.resourceId, this.selectedExpiresIn())
      .subscribe({
        next: (token) => {
          this.currentToken.set(token);
          this.state.set('link-ready');
          void this.copyToClipboard(this.sharingService.buildShareUrl(token.token)).then(
            (copied) => {
              this.snackBar.open(
                copied ? 'Lien copié ✓' : 'Lien généré — copiez-le manuellement',
                copied ? undefined : 'Fermer',
                {
                  duration: copied ? 3000 : 4000,
                  panelClass: copied ? 'snackbar-success' : 'snackbar-error',
                },
              );
            },
          );
        },
        error: (err: HttpErrorResponse) => {
          // 409 : un lien actif existe déjà (concurrence / statut non chargé) —
          // on ne crée pas de doublon, on réaffiche le lien existant.
          if (err.status === 409) {
            this.snackBar.open('Un lien actif existe déjà pour cette recette', 'Fermer', {
              duration: 4000,
              panelClass: 'snackbar-error',
            });
            this.loadActiveLink();
          } else {
            this.state.set('idle');
            this.snackBar.open('Impossible de générer le lien', 'Fermer', {
              duration: 4000,
              panelClass: 'snackbar-error',
            });
          }
        },
      });
  }

  private loadActiveLink(): void {
    this.sharingService
      .findActiveForResource(this.data.resourceType, this.data.resourceId)
      .subscribe({
        next: (tokens) => {
          if (tokens.length > 0) {
            this.currentToken.set(tokens[0]);
            this.state.set('link-ready');
          } else {
            this.currentToken.set(null);
            this.state.set('idle');
          }
        },
        error: () => {
          this.snackBar.open('Impossible de vérifier les liens de partage existants', 'Fermer', {
            duration: 4000,
            panelClass: 'snackbar-error',
          });
        },
      });
  }

  copyLink(): void {
    void this.copyToClipboard(this.shareUrl()).then((copied) => {
      this.snackBar.open(
        copied ? 'Lien copié ✓' : 'Impossible de copier dans le presse-papier',
        copied ? undefined : 'Fermer',
        { duration: 3000, panelClass: copied ? 'snackbar-success' : 'snackbar-error' },
      );
    });
  }

  /**
   * Copie dans le presse-papier de façon défensive : `navigator.clipboard`
   * est `undefined` hors contexte sécurisé (HTTP), ce qui lèverait une
   * TypeError synchrone non rattrapée par un simple `.catch`.
   */
  private async copyToClipboard(url: string): Promise<boolean> {
    const clipboard = navigator.clipboard;
    if (!clipboard) return false;
    try {
      await clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  regenerate(): void {
    const token = this.currentToken();
    if (!token) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Régénérer le lien de partage ?',
        message:
          'Le lien actuel sera révoqué et ne sera plus accessible. Vous pourrez ensuite en générer un nouveau.',
        confirmLabel: 'Régénérer',
      } satisfies ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.sharingService.revokeShareLink(token.id).subscribe({
        next: () => {
          this.currentToken.set(null);
          this.state.set('idle');
        },
        error: () =>
          this.snackBar.open('Impossible de régénérer le lien', 'Fermer', {
            duration: 4000,
            panelClass: 'snackbar-error',
          }),
      });
    });
  }

  revoke(): void {
    const token = this.currentToken();
    if (!token) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Révoquer le lien de partage ?',
        message: 'Ce lien ne sera plus accessible aux visiteurs.',
        confirmLabel: 'Révoquer',
      } satisfies ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.sharingService.revokeShareLink(token.id).subscribe({
        next: () => this.state.set('revoked'),
        error: () =>
          this.snackBar.open('Impossible de révoquer le lien', 'Fermer', {
            duration: 4000,
            panelClass: 'snackbar-error',
          }),
      });
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
