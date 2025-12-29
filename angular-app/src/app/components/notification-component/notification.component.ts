import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { COMMON_IMPORTS } from '../../core/imports';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss'],
  standalone: true,
  imports: [...COMMON_IMPORTS]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription!: Subscription;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    // Получаем уведомления через polling, так как сервис не реактивный
    // В реальном приложении можно сделать BehaviorSubject в сервисе
    this.subscription = new Subscription();
    
    const interval = setInterval(() => {
      this.notifications = this.notificationService.getNotifications();
    }, 100);
    
    this.subscription.add(() => clearInterval(interval));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  removeNotification(id: string) {
    this.notificationService.remove(id);
  }

  getIcon(type: string): string {
    const icons: { [key: string]: string } = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }
}