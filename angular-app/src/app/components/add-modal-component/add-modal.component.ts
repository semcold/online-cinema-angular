import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, AfterViewInit, ViewChild, ElementRef, NgZone, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { LibraryItem } from '../../models/library-item.model';
import { Subscription } from 'rxjs';
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
export class AddModalComponent implements OnInit, OnDestroy {
  @Input() item: LibraryItem | null = null;
  @Output() save = new EventEmitter<any>();
  @Output() close = new EventEmitter<void>();

  form: FormGroup<AddModalForm>;
  posterPath: string | null = null;
  playlistPath: string | null = null;
  isSaving = false;
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  private subscriptions = new Subscription();
  

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      title: new FormControl<string>('', [Validators.minLength(2), Validators.maxLength(100)])
    });    
  }


  ngOnInit() {
    console.log(this.item);    
    this.isSaving = false;   

    if (this.item) {
      this.form.patchValue({
        title: this.item.title
      });
      this.posterPath = this.item.posterPath;
      this.playlistPath = this.item.playlistPath;
    } else {      
      this.form.patchValue({
        title: ' '
      });
      this.posterPath = null;
      this.playlistPath = null;
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  async selectPoster() {
    if (!this.electronService.isElectron) return;
    
    try {
      const path = await this.electronService.selectPoster().toPromise();
      if (path) {
        this.zone.run(() => {
          this.posterPath = path;
          this.cdr.detectChanges();
          //this.focusTitle();
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
          //this.focusTitle();
        });
      }
    } catch (error) {
      console.error('Ошибка выбора плейлиста:', error);
    }
  }

  onSubmit() {
    // if (this.form.invalid || !this.posterPath || !this.playlistPath) {
    //   this.markFormGroupTouched(this.form);
    //   return;
    // }

    // Отключаем кнопку и отправляем данные
    console.log('[AddModal] onSubmit called');
    this.isSaving = true;
    
    const itemData = {
      id: this.item?.id,
      title: this.form.get('title')?.value?.trim(),
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
    console.log('я тут');
    this.cdr.detectChanges();
  } 

  getFileName(path: string | null): string {
    if (!path) return 'Файл не выбран';
    const parts = path.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return filename.length > 30 ? filename.substring(0, 30) + '...' : filename;
  }

  // private markFormGroupTouched(formGroup: FormGroup) {
  //   Object.values(formGroup.controls).forEach(control => {
  //     control.markAsTouched();
  //     if (control instanceof FormGroup) {
  //       this.markFormGroupTouched(control);
  //     }
  //   });
  // }

  get title() {
    return this.form.get('title');
  }
}