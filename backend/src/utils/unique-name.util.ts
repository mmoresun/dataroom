import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';

/** Splits "Report.pdf" into ["Report", ".pdf"]; folders/datarooms have no extension. */
function splitName(name: string): [base: string, ext: string] {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return [name, ''];
  return [name.slice(0, dot), name.slice(dot)];
}

const DUPLICATE_SUFFIX = / \(\d+\)$/;

/** Strips a trailing " (N)" so we bump the number instead of stacking another suffix onto it. */
function stripDuplicateSuffix(base: string): string {
  return base.replace(DUPLICATE_SUFFIX, '');
}

/**
 * Appends " (1)", " (2)", ... before the extension until the name is unique among siblings.
 * If `name` already ends in " (N)" (e.g. creating a name that collides with "folder (1)"),
 * that suffix is stripped first so the result is "folder (2)", not "folder (1) (1)".
 */
export function resolveUniqueName(
  existingNames: string[],
  name: string,
): string {
  const siblingNames = new Set(existingNames);
  if (!siblingNames.has(name)) return name;
  const [base, ext] = splitName(name);
  const coreBase = stripDuplicateSuffix(base);
  let i = 1;
  let candidate = `${coreBase} (${i})${ext}`;
  while (siblingNames.has(candidate)) {
    i += 1;
    candidate = `${coreBase} (${i})${ext}`;
  }
  return candidate;
}

/** Throws (rather than auto-suffixing) if `name` collides with an existing sibling — used for renames. */
export function assertNoNameCollision(
  existingNames: string[],
  name: string,
): void {
  if (existingNames.includes(name)) {
    throw new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: {
        name: 'nameAlreadyExists',
      },
    });
  }
}
