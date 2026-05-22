import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { LinkCategory } from '../../link-categories.service';
import { Link } from '../../links.service';
import { LinkItemComponent } from '../link-item/link-item.component';

@Component({
  selector: 'app-link-category-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    DragDropModule,
    LinkItemComponent,
  ],
  templateUrl: './link-category-card.component.html',
  styleUrl: './link-category-card.component.scss',
})
export class LinkCategoryCardComponent {
  @Input({ required: true }) category!: LinkCategory;
  @Input({ required: true }) links!: Link[];
  @Input() editMode = false;
  @Input() connectedTo: string[] = [];

  @Output() editCategory = new EventEmitter<LinkCategory>();
  @Output() deleteCategory = new EventEmitter<LinkCategory>();
  @Output() addLink = new EventEmitter<number>();
  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLink = new EventEmitter<Link>();
  @Output() reorderLinks = new EventEmitter<{ id: number; position: number }[]>();
  @Output() moveLink = new EventEmitter<{ linkId: number; targetCategoryId: number }>();

  dropLink(event: CdkDragDrop<Link[]>): void {
    if (event.previousContainer === event.container) {
      if (event.previousIndex === event.currentIndex) return;
      const reordered = [...this.links];
      moveItemInArray(reordered, event.previousIndex, event.currentIndex);
      this.reorderLinks.emit(reordered.map((l, i) => ({ id: l.id, position: i })));
    } else {
      const link = event.previousContainer.data[event.previousIndex];
      this.moveLink.emit({ linkId: link.id, targetCategoryId: this.category.id });
    }
  }
}
