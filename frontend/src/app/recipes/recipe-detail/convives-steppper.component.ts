import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-convives-steppper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './convives-steppper.component.html',
  styleUrls: ['./convives-steppper.component.scss'],
})
export class ConvivesSteppperComponent {
  @Input({ required: true }) value!: number;
  @Input() min = 1;
  @Input() max = 9999;
  @Input() compact = false;
  @Output() valueChange = new EventEmitter<number>();

  increment(): void {
    this.valueChange.emit(this.value + 1);
  }

  decrement(): void {
    if (this.value > this.min) {
      this.valueChange.emit(this.value - 1);
    }
  }
}
