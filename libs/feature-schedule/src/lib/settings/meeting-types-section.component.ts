import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActingContextStore } from '@app/shared/acting-context';
import { ScheduleApiService } from '@app/shared/schedule';
import {
  MEETING_TYPE_MAX_LENGTH_MINUTES,
  MEETING_TYPE_NAME_MAX_LENGTH,
  MEETING_TYPE_NAME_MIN_LENGTH,
  MEETING_TYPES_MAX_COUNT,
  CreateMeetingTypeRequest,
  MeetingType,
} from '@app/shared/types';
import { GENERIC_ERROR_MESSAGE, fieldErrors } from '@app/shared/utils';
import { UiBadgeComponent } from '@app/ui/badge';
import { UiButtonComponent } from '@app/ui/button';
import { UiCardComponent } from '@app/ui/card';
import { UiIconComponent } from '@app/ui/icons';
import { UiInputComponent } from '@app/ui/input';
import { UiModalComponent } from '@app/ui/modal';
import type { MeetingTypeEditTarget } from './schedule-settings.types';
import { formatLength } from './schedule-time';

/** The Provider's meeting types: a list with inline add / edit, delete after confirming. */
@Component({
  selector: 'feature-schedule-meeting-types-section',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    UiBadgeComponent,
    UiButtonComponent,
    UiCardComponent,
    UiIconComponent,
    UiInputComponent,
    UiModalComponent,
  ],
  templateUrl: './meeting-types-section.component.html',
  styleUrl: './meeting-types-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingTypesSectionComponent {
  private readonly scheduleApi = inject(ScheduleApiService);
  private readonly actingContext = inject(ActingContextStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly meetingTypes = input.required<readonly MeetingType[]>();
  /** The saved time unit: lengths offered are its multiples. */
  readonly timeUnitMinutes = input.required<number>();
  readonly changed = output<MeetingType[]>();

  protected readonly formatLength = formatLength;
  protected readonly maxCount = MEETING_TYPES_MAX_COUNT;
  protected readonly lengthOptions = computed(() => {
    const unit = this.timeUnitMinutes();
    return Array.from({ length: MEETING_TYPE_MAX_LENGTH_MINUTES / unit }, (_, index) => (index + 1) * unit);
  });

  protected readonly editing = signal<MeetingTypeEditTarget>(null);
  protected readonly confirmDelete = signal<MeetingType | null>(null);
  protected readonly pending = signal(false);
  protected readonly actionError = signal<string | null>(null);

  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(MEETING_TYPE_NAME_MIN_LENGTH),
        Validators.maxLength(MEETING_TYPE_NAME_MAX_LENGTH),
      ],
    }),
    lengthMinutes: new FormControl(60, { nonNullable: true }),
    defaultForClients: new FormControl(true, { nonNullable: true }),
  });

  private readonly submitted = signal(false);
  protected readonly nameError = fieldErrors(this.form, this.submitted)('name');

  protected onAdd(): void {
    this.openForm('new', { name: '', lengthMinutes: this.lengthOptions()[0], defaultForClients: true });
  }

  protected onEdit(type: MeetingType): void {
    this.openForm(type.id, {
      name: type.name,
      lengthMinutes: type.lengthMinutes,
      defaultForClients: type.defaultForClients,
    });
  }

  protected onCancelEdit(): void {
    this.editing.set(null);
    this.actionError.set(null);
  }

  protected onSave(): void {
    const target = this.editing();
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (target === null || this.form.invalid || this.pending()) {
      return;
    }

    const value = { ...this.form.getRawValue(), name: this.form.getRawValue().name.trim() };
    const providerId = this.actingContext.providerIdForRequest();
    const request$ =
      target === 'new'
        ? this.scheduleApi.createMeetingType(value, providerId)
        : this.scheduleApi.updateMeetingType(target, value, providerId);

    this.run(request$, (saved) => {
      const others = this.meetingTypes().filter((type) => type.id !== saved.id);
      this.changed.emit(sortTypes([...others, saved]));
      this.editing.set(null);
    });
  }

  protected onAskDelete(type: MeetingType): void {
    this.actionError.set(null);
    this.confirmDelete.set(type);
  }

  protected onConfirmDelete(): void {
    const type = this.confirmDelete();

    if (!type) {
      return;
    }

    this.run(
      this.scheduleApi.deleteMeetingType(type.id, this.actingContext.providerIdForRequest()),
      () => {
        this.confirmDelete.set(null);
        this.changed.emit(this.meetingTypes().filter((other) => other.id !== type.id));
      },
      () => this.confirmDelete.set(null),
    );
  }

  private openForm(target: MeetingTypeEditTarget, value: CreateMeetingTypeRequest): void {
    this.form.reset(value);
    this.submitted.set(false);
    this.actionError.set(null);
    this.editing.set(target);
  }

  private run<T>(
    request$: Observable<T>,
    onSuccess: (result: T) => void,
    onFailure?: () => void,
  ): void {
    this.pending.set(true);
    this.actionError.set(null);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.pending.set(false);
        onSuccess(result);
      },
      error: (error: unknown) => {
        this.pending.set(false);
        onFailure?.();
        this.actionError.set(toMessage(error));
      },
    });
  }
}

/** Shortest first, as the API returns them. */
function sortTypes(types: MeetingType[]): MeetingType[] {
  return types.sort((a, b) => a.lengthMinutes - b.lengthMinutes || a.name.localeCompare(b.name));
}

function toMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    return 'לא ניתן לשמור: בדקו את השם ואת האורך.';
  }

  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'סוג הפגישה הזה כבר לא קיים. רעננו את הדף.';
  }

  return GENERIC_ERROR_MESSAGE;
}
