import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { AppSettings } from '../../models/settings.model';
import { firstValueFrom } from 'rxjs';
import { COMMON_IMPORTS } from '../../core/imports';

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss'],
  standalone: true,
  imports: [...COMMON_IMPORTS] 
})
export class SettingsModalComponent implements OnInit {
  @Input() settings: AppSettings | null = null;
  @Output() save = new EventEmitter<AppSettings>();
  @Output() close = new EventEmitter<void>();

  window = window as any;

  form: FormGroup;
  autostartStatus = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private electronService: ElectronService
  ) {
    this.form = this.fb.group({
      autostart: [false],
      minimizeToTray: [true],
      startupMinimized: [false],
      theme: ['dark']
    });
  }

  async ngOnInit() {
    if (this.settings) {
      this.form.patchValue(this.settings);
    }

    if (this.electronService.isElectron) {
      try {
        this.autostartStatus = await firstValueFrom(this.electronService.getAutostartStatus());
      } catch (error) {
        console.error('Ошибка получения статуса автозапуска:', error);
      }
    }
  }

  async onSave() {
    if (this.form.invalid) return;

    const settings = this.form.value as AppSettings;
    // Блокируем кнопку и закрываем модал немедленно.
    this.loading = true;
    this.close.emit();
    // Отправляем настройки наверх — сохранение и автозапуск обрабатываются в app.component
    this.save.emit(settings);
  }

  onCancel() {
    this.close.emit();
  }

  get isWindows(): boolean {
    return this.electronService.platform === 'win32';
  }

  getThemeLabel(theme: string): string {
    const themes: { [key: string]: string } = {
      dark: 'Темная',
      light: 'Светлая',
      system: 'Системная'
    };
    return themes[theme] || theme;
  }
}