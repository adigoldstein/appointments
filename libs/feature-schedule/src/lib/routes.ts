import { Route } from '@angular/router';
import { ScheduleWeekPageComponent } from './calendar/schedule-week.page';
import { ScheduleSettingsPageComponent } from './settings/schedule-settings.page';

/** "יומן", the weekly view, mounted inside the Provider area (`/provider/…` and `/admin/provider/…`). */
export const featureScheduleWeekRoutes: Route[] = [
  {
    path: '',
    component: ScheduleWeekPageComponent,
  },
];

/** "הגדרות תורים", mounted inside the Provider area too. */
export const featureScheduleSettingsRoutes: Route[] = [
  {
    path: '',
    component: ScheduleSettingsPageComponent,
  },
];
