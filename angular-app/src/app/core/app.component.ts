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
  categories: any[] = [];
  selectedCategoryId: string | null = null;
  searchQuery: string = '';
  settings: AppSettings = {
    autostart: false,
    minimizeToTray: true,
    startupMinimized: false,
    theme: 'dark'
  };
  
  showAddModal = false;
  showSettingsModal = false;
  editingItem: LibraryItem | null = null;

  // Confirm delete category
  confirmDeleteCategory: any | null = null;

  // temporary input model for new category
  _newCategoryTitle: string = '';
  
  constructor(
    public electronService: ElectronService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    if (this.electronService.isElectron) {
      console.log('Running in Electron:', this.electronService.platform);
      
      // Загружаем начальные данные
      await this.loadCategories();
      await this.loadLibrary();
      await this.loadSettings();
      this.cdr.markForCheck();
      
      // Подписываемся на события Electron
      this.electronService.on('notification', (message: string, type: string) => {
        this.notificationService.show(message, type as any);
      });
    } else {
      console.log('Running in browser');
      // In browser mode also try to load categories for dev usability
      await this.loadCategories();
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

  async loadCategories() {
    try {
      if (!this.electronService.isElectron) {
        // In browser mode provide a default category for development
        this.categories = [{ id: 'default', title: 'Мультфильмы', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      } else {
        this.categories = await this.electronService.getCategories().toPromise() || [];
      }

      // Ensure there's at least a default category
      if (!this.selectedCategoryId && this.categories.length > 0) {
        const found = this.categories.find(c => c.id === this.selectedCategoryId);
        if (!found) {
          this.selectedCategoryId = this.categories[0].id;
        }
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
      this.showNotification('Ошибка загрузки категорий', 'error');
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

  selectCategory(cat: any) {
    this.selectedCategoryId = cat?.id ?? null;
    this.cdr.detectChanges();
  }

  async addCategory(title: string) {
    if (!title || title.trim().length < 1) return;
    const t = title.trim();
    try {
      if (!this.electronService.isElectron) {
        // Local behavior for browser/dev mode
        const newCat = { id: this.genId(), title: t, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        this.categories.push(newCat);
        this.selectedCategoryId = newCat.id;
        this.showNotification('Категория добавлена (локально)', 'success');
        this.cdr.detectChanges();
        return;
      }

      const resp: any = await this.electronService.saveCategory({ title: t }).toPromise();
      if (resp && resp.success) {
        this.categories = resp.data;
        // select newly added
        const newCat = this.categories.find((c: any) => c.title === t);
        if (newCat) this.selectedCategoryId = newCat.id;
        this.showNotification('Категория добавлена', 'success');
        this.cdr.detectChanges();
      } else {
        this.showNotification('Ошибка при добавлении категории', 'error');
      }
    } catch (error) {
      console.error('Ошибка добавления категории:', error);
      this.showNotification('Ошибка при добавлении категории', 'error');
    }
  }

  confirmDeleteCategoryItem(cat: any) {
    this.confirmDeleteCategory = cat;
  }

  async confirmDeleteCategoryCancel() {
    this.confirmDeleteCategory = null;
  }

  async confirmDeleteCategoryAccept() {
    const cat = this.confirmDeleteCategory;
    this.confirmDeleteCategory = null;
    if (!cat) return;

    try {
      if (!this.electronService.isElectron) {
        // local behavior: remove and reassign
        this.categories = this.categories.filter(c => c.id !== cat.id);
        if (this.selectedCategoryId === cat.id) {
          this.selectedCategoryId = this.categories.length ? this.categories[0].id : null;
        }
        this.library = this.library.map(i => i.categoryId === cat.id ? { ...i, categoryId: null } : i);
        this.showNotification('Категория удалена (локально)', 'success');
        this.cdr.detectChanges();
        return;
      }

      const resp: any = await this.electronService.deleteCategory(cat.id).toPromise();
      if (resp && resp.success) {
        this.categories = resp.data;
        // If deleted category was selected, pick first
        if (this.selectedCategoryId === cat.id) {
          this.selectedCategoryId = this.categories.length ? this.categories[0].id : null;
        }
        // reload library to get reassigned items
        await this.loadLibrary();
        this.showNotification('Категория удалена', 'success');
      } else {
        this.showNotification('Ошибка удаления категории', 'error');
      }
    } catch (error) {
      console.error('Ошибка удаления категории:', error);
      this.showNotification('Ошибка удаления категории', 'error');
    }
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

    // Ensure category assignment from current selection when not provided
    if (typeof itemData.categoryId === 'undefined' || itemData.categoryId === null) {
      itemData.categoryId = this.selectedCategoryId ?? null;
    }
    
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

  /* Очистить поле поиска */
  clearSearch() {
    this.searchQuery = '';
    this.cdr.detectChanges();
  }

  /* Фильтр по названию и категории */
  get filteredLibrary(): LibraryItem[] {
    let list = this.library;
    if (this.selectedCategoryId) {
      list = list.filter(i => (i.categoryId ?? null) === this.selectedCategoryId);
    }
    if (!this.searchQuery) return list;
    const q = this.searchQuery.trim().toLowerCase();
    return list.filter(i => (i.title || '').toLowerCase().includes(q));
  }

  get currentCategoryTitle(): string {
    return this.categories.find(c => c.id === this.selectedCategoryId)?.title || '';
  }

  getSelectedCategoryTitle(): string {
    const c = this.categories.find(c => c.id === this.selectedCategoryId);
    return c?.title || '';
  }

  // Simple id generator for dev-mode categories
  private genId() {
    return 'c-' + Math.random().toString(36).slice(2, 9);
  }
}