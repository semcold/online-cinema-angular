import { Injectable } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Notification[] = [];

  show(message: string, type: NotificationType = 'info', duration: number = 3000): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification: Notification = { id, type, message, duration };
    
    this.notifications.push(notification);
    
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
    
    return id;
  }

  remove(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  clear(): void {
    this.notifications = [];
  }
}