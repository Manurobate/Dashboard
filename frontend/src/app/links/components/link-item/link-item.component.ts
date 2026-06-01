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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['link']) {
      this.hasFaviconError.set(false);
    }
  }

  onFaviconError(): void {
    this.hasFaviconError.set(true);
  }
}
