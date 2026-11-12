import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Link } from '../../links.service';

@Component({
  selector: 'app-link-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, DragDropModule],
  templateUrl: './link-item.component.html',
  styleUrl: './link-item.component.scss',
})
export class LinkItemComponent implements OnChanges {
  @Input({ required: true }) link!: Link;
  @Input() editMode = false;

  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLink = new EventEmitter<Link>();

  readonly hasFaviconError = signal(false);

  /** Monogramme de 2 caractères affiché quand le favicon est absent ou en erreur. */
  monogram = '?';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['link']) {
      this.hasFaviconError.set(false);
      this.monogram = linkMonogram(this.link.title);
    }
  }

  onFaviconError(): void {
    this.hasFaviconError.set(true);
  }
}

/** Découpe en caractères visibles (emoji composés, drapeaux, accents combinés). */
function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Deux mots ou plus (séparés par espace, `.`, `-` ou `_`) : initiales des deux premiers.
 * Un seul mot : ses deux premiers caractères. Titre vide : `?`.
 * Toujours 2 caractères visibles au plus, même si la majuscule s'allonge (`ß` → `SS`).
 */
export function linkMonogram(title: string): string {
  const words = (title ?? '').split(/[\s._-]+/).filter((w) => w.length > 0);
  if (words.length === 0) return '?';
  const chars =
    words.length >= 2
      ? [graphemes(words[0])[0], graphemes(words[1])[0]]
      : graphemes(words[0]).slice(0, 2);
  return graphemes(chars.join('').toUpperCase()).slice(0, 2).join('');
}
