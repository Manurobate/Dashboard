import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RecipesService } from './recipes.service';

@Component({
  selector: 'app-recipes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './recipes.component.html',
  styleUrl: './recipes.component.scss',
})
export class RecipesComponent implements OnInit {
  protected readonly recipesService = inject(RecipesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly searchQuery = signal('');

  readonly categorizedRecipes = computed(() => {
    const map = new Map<string, ReturnType<typeof this.recipesService.recipes>[number][]>();
    for (const r of this.recipesService.recipes()) {
      const key = r.category ?? 'Sans catégorie';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([category, recipes]) => ({ category, recipes }));
  });

  readonly filteredRecipes = computed(() => {
    const term = this.searchQuery().toLowerCase().trim();
    if (!term) return [];
    return this.recipesService.recipes().filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        (r.category ?? '').toLowerCase().includes(term),
    );
  });

  readonly isSearching = computed(() => this.searchQuery().trim().length > 0);

  constructor() {
    this.searchSubject
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchQuery.set(term));
  }

  ngOnInit(): void {
    this.recipesService.loadRecipes().subscribe();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }
}
