import { Component, OnInit, OnDestroy } from '@angular/core';
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
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    if (this.electronService.isElectron) {
      console.log('Running in Electron:', this.electronService.platform);
      
      // Загружаем начальные данные
      await this.loadLibrary();
      await this.loadSettings();
      
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
    } catch (error) {
      console.error('Ошибка загрузки библиотеки:', error);
      this.showNotification('Ошибка загрузки библиотеки', 'error');
    }
  }

  async loadSettings() {
    try {
      this.settings = await this.electronService.getSettings().toPromise() || this.settings;
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

  deleteItem(item: LibraryItem) {
    if (confirm(`Удалить "${item.title}"?`)) {
      this.electronService.deleteItem(item.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.library = response.data;
            this.showNotification('Мультфильм удален', 'success');
          }
        },
        error: () => {
          this.showNotification('Ошибка удаления', 'error');
        }
      });
    }
  }

  async onSaveItem(itemData: any) {
    try {
      const response = await this.electronService.saveItem(itemData).toPromise();
      if (response && response.success) {
        this.library = response.data;
        this.showAddModal = false;
        this.editingItem = null;
        this.showNotification(
          itemData.id ? 'Изменения сохранены' : 'Мультфильм добавлен',
          'success'
        );
      }
    } catch (error) {
      this.showNotification('Ошибка сохранения', 'error');
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
    const response = await this.electronService.saveSettings(settings).toPromise();
    if (response && response.success) {
      this.settings = settings;
      this.showNotification('Настройки сохранены', 'success');
      this.closeSettings();
    } else {
      this.showNotification('Ошибка сохранения настроек', 'error');
    }
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