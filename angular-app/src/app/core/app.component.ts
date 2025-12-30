import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { LibraryItem } from '../models/library-item.model';
import { AppSettings } from '../models/settings.model';
import { ElectronService } from '../services/electron.service';
import { NotificationService } from '../services/notification.service';
import { COMMON_IMPORTS } from './imports';
import { SettingsModalComponent } from '../components/settings-modal-component/settings-modal.component';
import { CardComponent } from '../components/card-component/card.component';
import { NotificationComponent } from '../components/notification-component/notification.component';
import { AddModalComponent } from '../components/add-modal-component/add-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [...COMMON_IMPORTS, CardComponent, SettingsModalComponent, NotificationComponent, AddModalComponent]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Домашний Кинотеатр';
  library: LibraryItem[] = [];
  settings: AppSettings = {
    autostart: false,
    minimizeToTray: true,
    startupMinimized: false,
    theme: 'dark'
  };
  
  showAddModal = false;
  showSettingsModal = false;
  editingItem: LibraryItem | null = null;
  
  constructor(
    public electronService: ElectronService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    if (this.electronService.isElectron) {
      console.log('Running in Electron:', this.electronService.platform);
      
      // Загружаем начальные данные
      await this.loadLibrary();
      await this.loadSettings();
      this.cdr.markForCheck();
      
      // Подписываемся на события Electron
      this.electronService.on('notification', (message: string, type: string) => {
        this.notificationService.show(message, type as any);
      });
    } else {
      console.log('Running in browser');
    }
  }

  ngOnDestroy() {
    if (this.electronService.isElectron) {
      this.electronService.off('notification', () => {});
    }
  }

  async loadLibrary() {
    try {
      this.library = await this.electronService.getLibrary().toPromise() || [];
      this.library.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Ошибка загрузки библиотеки:', error);
      this.showNotification('Ошибка загрузки библиотеки', 'error');
    }
  }

  async loadSettings() {
    try {
      this.settings = await this.electronService.getSettings().toPromise() || this.settings;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  }

  playItem(item: LibraryItem) {
    this.electronService.playPlaylist(item.playlistPath).subscribe({
      next: (result) => {
        if (!result.success) {
          this.showNotification(result.error || 'Ошибка воспроизведения', 'error');
        }
      },
      error: (error) => {
        this.showNotification('Ошибка воспроизведения', 'error');
      }
    });
  }

  // ДОБАВЛЕНО: Метод для открытия модалки добавления
  openAddModal(item?: LibraryItem) {
    this.editingItem = item || null;
    this.showAddModal = true;
  }

  // ДОБАВЛЕНО: Метод для закрытия модалки добавления
  onCloseAddModal() {
    this.showAddModal = false;
    this.editingItem = null;
  }

  editItem(item: LibraryItem) {    
    this.openAddModal(item);
  }

  // Non-blocking delete: show confirm UI instead of native confirm()
  confirmDeleteItem: LibraryItem | null = null;

  deleteItem(item: LibraryItem) {
    this.confirmDeleteItem = item;
  }

  async confirmDeleteCancel() {
    this.confirmDeleteItem = null;
  }

  async confirmDeleteAccept() {
    const item = this.confirmDeleteItem;
    this.confirmDeleteItem = null;
    if (!item) return;

    this.electronService.deleteItem(item.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.library = response.data;
          this.library.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
          this.cdr.detectChanges();
          this.showNotification('Мультфильм удален', 'success');
        } else {
          this.showNotification('Ошибка удаления', 'error');
        }
      },
      error: () => {
        this.showNotification('Ошибка удаления', 'error');
      }
    });
  }

  async onSaveItem(itemData: any) {
    if (!itemData) return;
    
    try {
      const response = await this.electronService.saveItem(itemData).toPromise();
      if (response && response.success) {
        this.library = response.data;
        this.library.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        // Уведомляем Angular об изменении данных
        this.cdr.detectChanges();
        this.showNotification(
          itemData.id ? 'Изменения сохранены' : 'Мультфильм добавлен',
          'success'
        );
      } else {
        this.showNotification('Ошибка сохранения', 'error');
        // Если ошибка, можно показать модал снова
        this.showAddModal = true;
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      this.showNotification('Ошибка сохранения', 'error');
      // Если ошибка, можно показать модал снова
      this.showAddModal = true;
    }
  }

  // ДОБАВЛЕНО: Метод для открытия настроек
  openSettings() {
    this.showSettingsModal = true;
  }

  // ДОБАВЛЕНО: Метод для закрытия настроек
  closeSettings() {
    this.showSettingsModal = false;
  }

  async onSaveSettings(settings: AppSettings) {
    // Сначала применяем изменения в UI
    const prevAutostart = this.settings?.autostart;
    this.settings = settings;
    this.cdr.detectChanges();
    this.showNotification('Сохранение настроек...', 'info');
    this.closeSettings();

    // Выполняем сохранение и автозапуск асинхронно
    (async () => {
      try {
        // Автозапуск: если изменился, применяем
        if (this.electronService.isElectron && settings.autostart !== prevAutostart) {
          const res = await this.electronService.setAutostart(settings.autostart).toPromise();
          if (!res || !res.success) {
            console.error('Ошибка настройки автозапуска:', res?.error);
          }
        }

        if (this.electronService.isElectron) {
          const resp = await this.electronService.saveSettings(settings).toPromise();
          if (resp && resp.success) {
            this.showNotification('Настройки сохранены', 'success');
          } else {
            this.showNotification('Ошибка сохранения настроек', 'error');
          }
        } else {
          this.showNotification('Настройки сохранены', 'success');
        }
      } catch (error) {
        console.error('Ошибка при сохранении настроек:', error);
        this.showNotification('Ошибка сохранения настроек', 'error');
      }
    })();
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.notificationService.show(message, type);
  }

  // Управление окном Electron
  minimize() {
    if (this.electronService.isElectron) {
      this.electronService.minimizeWindow().subscribe();
    }
  }

  maximize() {
    if (this.electronService.isElectron) {
      this.electronService.maximizeWindow().subscribe();
    }
  }

  close() {
    if (this.electronService.isElectron) {
      this.electronService.closeWindow().subscribe();
    }
  }

  // Вспомогательные методы
  getFileName(path: string): string {
    if (!path) return '';
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/placeholder.jpg';
  }
}