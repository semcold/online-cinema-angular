import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, AfterViewInit, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { LibraryItem } from '../../models/library-item.model';
import { COMMON_IMPORTS } from '../../core/imports';

interface AddModalForm {	
	title: FormControl<string | null>;
}

@Component({
  selector: 'app-add-modal',
  templateUrl: './add-modal.component.html',
  styleUrls: ['./add-modal.component.scss'],
  standalone: true,
  imports: [COMMON_IMPORTS]
})
export class AddModalComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() item: LibraryItem | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup<AddModalForm>;
  posterPath: string | null = null;
  playlistPath: string | null = null;
  isSaving = false;
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: new FormControl<string>('', [Validators.minLength(2), Validators.maxLength(100), this.whitespaceValidator()])
    });    
  }

  ngAfterViewInit() {
    // Ensure focus on input field after view initialization
    if (this.titleInput) {
      this.zone.run(() => {
        this.titleInput.nativeElement.focus();
        this.cdr.detectChanges();
      });
    }
  }

  ngOnInit() {
    this.isSaving = false;   

    if (this.item) {
      this.form.patchValue({
        title: this.item.title
      });
      this.posterPath = this.item.posterPath;
      this.playlistPath = this.item.playlistPath;
    } else {  
      this.posterPath = null;
      this.playlistPath = null;
    }
  }

  ngOnDestroy() {
  }

  async selectPoster() {
    if (!this.electronService.isElectron) return;
    
    try {
      const path = await this.electronService.selectPoster().toPromise();
      if (path) {
        this.zone.run(() => {
          this.posterPath = path;
          this.cdr.detectChanges();
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
        });
      }
    } catch (error) {
      console.error('Ошибка выбора плейлиста:', error);
    }
  }

  onSubmit() {
    // Validate form and required files
    if (this.form.invalid || !this.posterPath || !this.playlistPath) {
      this.form.markAllAsTouched();
      return;
    }

    // Отключаем кнопку и отправляем данные
    this.isSaving = true;
    
    // Trim title to remove accidental leading/trailing spaces
    const rawTitle = this.form.get('title')?.value || '';
    const title = (rawTitle as string).trim();

    const itemData = {
      id: this.item?.id,
      title,
      posterPath: this.posterPath!,
      playlistPath: this.playlistPath!
    };

    // Сразу закрываем модал
    this.close.emit();
    
    // Отправляем данные (обработка будет в app.component)
    this.save.emit(itemData);
  }

  onCancel() {
    this.isSaving = false;
    this.close.emit();
  }
  ensureInputFocus() {
    // Lightweight change detection trigger to reflect file selection
    this.cdr.detectChanges();
  } 

  getFileName(path: string | null): string {
    if (!path) return 'Файл не выбран';
    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.length > 30 ? filename.substring(0, 30) + '...' : filename;
  }

  // Validator: disallow values that are only whitespace
  private whitespaceValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const v = control.value as string | null;
      if (v == null) return null;
      if (v.trim().length === 0) return { whitespace: true };
      return null;
    };
  }

  get title() {
    return this.form.get('title');
  }
}