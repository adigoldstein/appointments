import { ValidationOptions, ValidateBy } from 'class-validator';
import { parseIsraeliMobile } from '../utils/israeli-mobile.util';

/** Optional: empty/undefined passes; non-empty must be a valid Israeli mobile (stored as 05XXXXXXXX). */
export function IsIsraeliMobileCellOptional(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIsraeliMobileCellOptional',
      constraints: [],
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          if (typeof value === 'string' && value.trim() === '') {
            return true;
          }

          return parseIsraeliMobile(value) !== null;
        },
        defaultMessage(): string {
          return 'phone must be a valid Israeli mobile number in the form 05XXXXXXXX';
        },
      },
    },
    validationOptions,
  );
}
