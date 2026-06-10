import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'markdownLight',
  standalone: true,
  pure: true,
})
export class MarkdownLightPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return (
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // **bold** avant *italic* pour éviter les collisions
        .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    );
  }
}
