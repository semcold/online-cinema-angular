import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, AfterViewInit, ViewChild, ElementRef, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { LibraryItem } from '../../models/library-item.model';
import { Subscription } from 'rxjs';
import { COMMON_IMPORTS } from '../../core/imports';

@Component({
  selector: 'app-add-modal',
  templateUrl: './add-modal.component.html',
  styleUrls: ['./add-modal.component.scss'],
  standalone: true,
  imports: [COMMON_IMPORTS]
})
export class AddModalComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() item: LibraryItem | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  posterPath: string | null = null;
  playlistPath: string | null = null;
  isSaving = false;
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  private subscriptions = new Subscription();
  private userInteracted = false;
  private pointerHandler = () => { this.userInteracted = true; };
  private focusInHandler = (e: FocusEvent) => {
    try {
      if (!this.titleInput) return;
      const el = this.titleInput.nativeElement;
      const target = e.target as Element | null;
      if (target && target !== el && !el.contains(target)) {
        if (!this.userInteracted) {
          setTimeout(() => this.focusTitle(), 20);
        }
      }
    } catch (err) {
      console.error('[AddModal] focusInHandler error:', err);
    }
  };

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
    });
  }

  ngAfterViewInit() {
    // Ставим фокус на поле названия после инициализации представления
    try {
      console.log('[AddModal] AfterViewInit - titleInput:', !!this.titleInput);
      if (this.titleInput) {
        const el = this.titleInput.nativeElement;
        console.log('[AddModal] Input element:', {
          disabled: el.disabled,
          readonly: el.readOnly,
          value: el.value,
          className: el.className
        });

        // Добавляем обработчик чтобы вернуть фокус при клике на кнопки
        el.addEventListener('focus', () => {
          console.log('[AddModal] Input focus gained');
        });
        el.addEventListener('blur', () => {
          console.log('[AddModal] Input focus lost');
        });
      }
      this.focusTitle();
      // track user pointer interactions to avoid fighting intentional clicks
      try {
        document.addEventListener('mousedown', this.pointerHandler, true);
        document.addEventListener('touchstart', this.pointerHandler, true);
        document.addEventListener('focusin', this.focusInHandler, true);
      } catch (e) {
        console.warn('[AddModal] Could not attach global listeners', e);
      }
    } catch (e) {
      console.error('[AddModal] AfterViewInit error:', e);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['item']) {
      // Когда меняется входной элемент (редактирование/создание), ставим фокус
      setTimeout(() => this.focusTitle(), 0);
    }
  }

  private focusTitle() {
    try {
      if (!this.titleInput) {
        console.warn('[AddModal] titleInput not available');
        return;
      }
      const el = this.titleInput.nativeElement;
      console.log('[AddModal] Before focus:', {
        disabled: el.disabled,
        readonly: el.readOnly,
        focused: document.activeElement === el
      });
      
      const delays = [0, 50, 150, 300, 600, 1200, 2500];
      const tryFocus = (index = 0) => {
        if (!this.titleInput) return;
        if (this.userInteracted && index > 0) {
          console.log('[AddModal] User interacted, stopping auto-refocus');
          return;
        }
        setTimeout(() => {
          try {
            this.zone.run(() => {
              el.disabled = false;
              el.focus();
              const val = el.value || '';
              try { el.setSelectionRange(val.length, val.length); } catch (e) {}
              console.log('[AddModal] After focus attempt', index + 1, '- state:', {
                focused: document.activeElement === el,
                disabled: el.disabled,
                readonly: el.readOnly,
                value: el.value
              });
              this.cdr.detectChanges();
            });
          } catch (err) {
            console.error('[AddModal] Focus error:', err);
          }
          if (document.activeElement !== el && index + 1 < delays.length && !this.userInteracted) {
            tryFocus(index + 1);
          }
        }, delays[index] ?? 200);
      };
      tryFocus(0);
    } catch (e) {
      console.error('[AddModal] focusTitle error:', e);
    }
  }

  ngOnInit() {
    // Reset state when modal created/opened
    this.isSaving = false;
    this.form.enable();
    const titleControl = this.form.get('title');
    if (titleControl) {
      titleControl.enable();
    }

    if (this.item) {
      this.form.patchValue({
        title: this.item.title
      });
      this.posterPath = this.item.posterPath;
      this.playlistPath = this.item.playlistPath;
    } else {
      // clear previous values when adding new
      this.form.reset({ title: '' });
      this.posterPath = null;
      this.playlistPath = null;
    }

    // Log for debugging
    console.log('[AddModal] Initialized - form enabled:', !this.form.disabled);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    try {
      document.removeEventListener('mousedown', this.pointerHandler, true);
      document.removeEventListener('touchstart', this.pointerHandler, true);
      document.removeEventListener('focusin', this.focusInHandler, true);
    } catch (e) {
      // ignore
    }
  }

  async selectPoster() {
    if (!this.electronService.isElectron) return;
    
    try {
      const path = await this.electronService.selectPoster().toPromise();
      if (path) {
        this.zone.run(() => {
          this.posterPath = path;
          this.cdr.detectChanges();
          this.focusTitle();
        });
      }
    } catch (error) {
      console.error('Ошибка выбора постера:', error);
    }
  }

  async selectPlaylist() {
    if (!this.electronService.isElectron) return;
    
    try {
      const path = await this.electronService.selectPlaylist().toPromise();
      if (path) {
        this.zone.run(() => {
          this.playlistPath = path;
          this.cdr.detectChanges();
          this.focusTitle();
        });
      }
    } catch (error) {
      console.error('Ошибка выбора плейлиста:', error);
    }
  }

  onSubmit() {
    if (this.form.invalid || !this.posterPath || !this.playlistPath) {
      this.markFormGroupTouched(this.form);
      return;
    }

    // Отключаем кнопку и отправляем данные
    console.log('[AddModal] onSubmit called');
    this.isSaving = true;
    
    const itemData = {
      id: this.item?.id,
      title: this.form.get('title')?.value.trim(),
      posterPath: this.posterPath!,
      playlistPath: this.playlistPath!
    };

    // Сразу закрываем модал
    this.close.emit();
    
    // Отправляем данные (обработка будет в app.component)
    this.save.emit(itemData);
  }

  onCancel() {
    console.log('[AddModal] onCancel called');
    this.isSaving = false;
    this.close.emit();
  }

  ensureInputFocus() {
    // После клика на кнопку в форме, убедимся что инпут всё ещё может получить фокус
    if (this.titleInput && document.activeElement !== this.titleInput.nativeElement) {
      console.log('[AddModal] Ensuring input is focusable after button click');
      // Не устанавливаем фокус сразу, но убедимся что инпут не заблокирован
      const el = this.titleInput.nativeElement;
      el.disabled = false;
      el.readOnly = false;
      // mark that user interacted so auto-refocus logic won't fight clicks
      this.userInteracted = true;
    }
  }

  getFileName(path: string | null): string {
    if (!path) return 'Файл не выбран';
    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.length > 30 ? filename.substring(0, 30) + '...' : filename;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get title() {
    return this.form.get('title');
  }
}