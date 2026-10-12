import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import { MeetingType, ScheduleSettingsResponse } from '@app/shared/types';
import { UiButtonComponent } from '@app/ui/button';
import { GeneralSectionComponent } from './general-section.component';
import { MeetingTypesSectionComponent } from './meeting-types-section.component';
import { WeeklyHoursSectionComponent } from './weekly-hours-section.component';

/**
 * "הגדרות תורים" (ADR-0009, plan step 3): time unit and cancellation window, meeting types,
 * weekly hours. Each section saves on its own. Works on the Provider on screen: the Provider
 * themselves, or the one an Admin selected.
 */
@Component({
  selector: 'feature-schedule-settings-page',
  standalone: true,
  imports: [
    GeneralSectionComponent,
    MeetingTypesSectionComponent,
    RouterLink,
    UiButtonComponent,
    WeeklyHoursSectionComponent,
  ],
  templateUrl: './schedule-settings.page.html',
  styleUrl: './schedule-settings.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSettingsPageComponent {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);

  protected readonly settings = rxResource({
    params: () => ({ providerId: this.actingContext.providerIdForRequest() }),
    stream: ({ params }) => this.scheduleApi.getSettings(params.providerId),
  });

  /** The loaded settings, kept up to date by what the sections save. */
  protected readonly current = linkedSignal<ScheduleSettingsResponse | null>(() =>
    this.settings.hasValue() ? this.settings.value() : null,
  );

  /** 404: the business details (onboarding) aren't done yet, so there's nothing to set up. */
  protected readonly notOnboarded = computed(() => {
    const error = this.settings.error();
    const cause = error instanceof HttpErrorResponse ? error : (error as { cause?: unknown } | undefined)?.cause;
    return cause instanceof HttpErrorResponse && cause.status === 404;
  });

  protected readonly businessDetailsUrl = computed(
    () => `${this.actingContext.providerBaseUrl() ?? '/provider'}/settings`,
  );

  protected readonly actingProviderName = this.actingContext.actingProviderName;

  protected onSettingsSaved(settings: ScheduleSettingsResponse): void {
    this.current.set(settings);
  }

  protected onMeetingTypesChanged(meetingTypes: MeetingType[]): void {
    this.current.update((settings) => settings && { ...settings, meetingTypes });
  }

  protected onRetry(): void {
    this.settings.reload();
  }
}
