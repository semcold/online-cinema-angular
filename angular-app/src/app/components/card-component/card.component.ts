import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LibraryItem } from '../../models/library-item.model';
import { COMMON_IMPORTS } from '../../core/imports';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true,
  imports: [...COMMON_IMPORTS]
})
export class CardComponent {
  @Input() item!: LibraryItem;
  @Output() play = new EventEmitter<LibraryItem>();
  @Output() edit = new EventEmitter<LibraryItem>();
  @Output() delete = new EventEmitter<LibraryItem>();

  getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.jpg';
  }

  onPlay() {
    this.play.emit(this.item);
  }

  onEdit(event: Event) {
    event.stopPropagation();
    this.edit.emit(this.item);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    this.delete.emit(this.item);
  }
}