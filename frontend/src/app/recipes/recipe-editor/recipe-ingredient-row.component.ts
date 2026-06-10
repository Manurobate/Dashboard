import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  input,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-recipe-ingredient-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    NgIf,
  ],
  templateUrl: './recipe-ingredient-row.component.html',
  styleUrls: ['./recipe-ingredient-row.component.scss'],
})
export class RecipeIngredientRowComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  readonly ingredientSuggestions = input<string[]>([]);
  readonly unitSuggestions = input<string[]>([]);
  @Output() deleteRow = new EventEmitter<void>();

  readonly nameQuery = signal('');
  readonly unitQuery = signal('');

  readonly filteredIngredients = computed(() => {
    const q = this.nameQuery().toLowerCase();
    if (!q) return this.ingredientSuggestions();
    return this.ingredientSuggestions().filter((s) => s.toLowerCase().includes(q));
  });

  readonly filteredUnits = computed(() => {
    const q = this.unitQuery().toLowerCase();
    if (!q) return this.unitSuggestions();
    return this.unitSuggestions().filter((s) => s.toLowerCase().includes(q));
  });
}
