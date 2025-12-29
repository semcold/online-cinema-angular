import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { LibraryItem, SaveItemRequest, SaveItemResponse } from '../models/library-item.model';
import { AppSettings } from '../models/settings.model';

// TypeScript интерфейсы для Electron API
declare global {
  interface Window {
    electronAPI: {
      getLibrary: () => Promise<LibraryItem[]>;
      saveItem: (item: SaveItemRequest) => Promise<SaveItemResponse>;
      deleteItem: (id: string) => Promise<SaveItemResponse>;
      selectPoster: () => Promise<string>;
      selectPlaylist: () => Promise<string>;
      playPlaylist: (path: string) => Promise<{ success: boolean; error?: string }>;
      getSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>;
      setAutostart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getAutostartStatus: () => Promise<boolean>;
      minimizeWindow: () => Promise<boolean>;
      maximizeWindow: () => Promise<boolean>;
      closeWindow: () => Promise<boolean>;
      on: (channel: string, callback: Function) => void;
      off: (channel: string, callback: Function) => void;
    };
    __ELECTRON__: {
      isElectron: boolean;
      platform: string;
      version: string;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  get isElectron(): boolean {
    return !!(window.electronAPI && window.__ELECTRON__?.isElectron);
  }

  get platform(): string {
    return window.__ELECTRON__?.platform || 'web';
  }

  // Библиотека
  getLibrary(): Observable<LibraryItem[]> {
    return from(window.electronAPI.getLibrary());
  }

  saveItem(item: SaveItemRequest): Observable<SaveItemResponse> {
    return from(window.electronAPI.saveItem(item));
  }

  deleteItem(id: string): Observable<SaveItemResponse> {
    return from(window.electronAPI.deleteItem(id));
  }

  // Файлы
  selectPoster(): Observable<string> {
    return from(window.electronAPI.selectPoster());
  }

  selectPlaylist(): Observable<string> {
    return from(window.electronAPI.selectPlaylist());
  }

  // Воспроизведение
  playPlaylist(path: string): Observable<{ success: boolean; error?: string }> {
    return from(window.electronAPI.playPlaylist(path));
  }

  // Настройки
  getSettings(): Observable<AppSettings> {
    return from(window.electronAPI.getSettings());
  }

  saveSettings(settings: AppSettings): Observable<{ success: boolean }> {
    return from(window.electronAPI.saveSettings(settings));
  }

  setAutostart(enabled: boolean): Observable<{ success: boolean; error?: string }> {
    return from(window.electronAPI.setAutostart(enabled));
  }

  getAutostartStatus(): Observable<boolean> {
    return from(window.electronAPI.getAutostartStatus());
  }

  // Управление окном
  minimizeWindow(): Observable<boolean> {
    return from(window.electronAPI.minimizeWindow());
  }

  maximizeWindow(): Observable<boolean> {
    return from(window.electronAPI.maximizeWindow());
  }

  closeWindow(): Observable<boolean> {
    return from(window.electronAPI.closeWindow());
  }

  // События
  on(channel: string, callback: Function): void {
    if (this.isElectron) {
      window.electronAPI.on(channel, callback);
    }
  }

  off(channel: string, callback: Function): void {
    if (this.isElectron) {
      window.electronAPI.off(channel, callback);
    }
  }
}