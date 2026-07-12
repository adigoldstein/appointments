import { ValidationOptions, ValidateBy } from 'class-validator';
import { isKnownIsraelLocalityId } from '../reference/israel-localities.loader';

/** Optional: empty/undefined passes; otherwise must match an id from israel-localities.json */
export function IsIsraelLocalityCityIdOptional(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isIsraelLocalityCityIdOptional',
      constraints: [],
      validator: {
        validate(value: unknown): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          const n =
            typeof value === 'number'
              ? value
              : Number.parseInt(String(value), 10);

          if (!Number.isInteger(n) || n < 1) {
            return false;
          }

          return isKnownIsraelLocalityId(n);
        },
        defaultMessage(): string {
          return 'cityId must be a valid locality id from the Israeli localities list';
        },
      },
    },
    validationOptions,
  );
}
