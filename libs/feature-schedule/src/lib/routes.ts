import { Route } from '@angular/router';
import { ScheduleSettingsPageComponent } from './settings/schedule-settings.page';

/** "הגדרות תורים", mounted inside the Provider area (`/provider/…` and `/admin/provider/…`). */
export const featureScheduleSettingsRoutes: Route[] = [
  {
    path: '',
    component: ScheduleSettingsPageComponent,
  },
];
