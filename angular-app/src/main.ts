import { bootstrapApplication, platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/core/app.module';
import { AppComponent } from './app/core/app.component';
import { appConfig } from './app/app.config';

// Проверяем, работает ли приложение в Electron
if (window.electronAPI) {
  console.log('Running in Electron environment');
  // Настраиваем глобальные обработчики ошибок для Electron
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}
bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
