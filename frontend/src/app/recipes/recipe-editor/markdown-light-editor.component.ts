import {
  Component,
  ChangeDetectionStrategy,
  forwardRef,
  signal,
  ViewChild,
  ElementRef,
  Input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-markdown-light-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownLightEditorComponent),
      multi: true,
    },
  ],
  templateUrl: './markdown-light-editor.component.html',
  styleUrls: ['./markdown-light-editor.component.scss'],
})
export class MarkdownLightEditorComponent implements ControlValueAccessor {
  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @Input() placeholder = 'Décrivez cette étape...';

  readonly value = signal('');
  readonly isDisabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string): void {
    this.value.set(v ?? '');
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }

  insertMarkdown(syntax: string): void {
    const el = this.textareaRef.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const replacement = selected ? `${syntax}${selected}${syntax}` : `${syntax}${syntax}`;
    const newVal = el.value.slice(0, start) + replacement + el.value.slice(end);
    el.value = newVal;
    el.setSelectionRange(start + syntax.length, start + syntax.length + selected.length);
    this.value.set(newVal);
    this.onChange(newVal);
    this.onTouched();
    el.focus();
  }
}
