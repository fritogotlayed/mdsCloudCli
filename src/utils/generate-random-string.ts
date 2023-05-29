import { generate } from 'randomstring';

export function generateRandomString(length: number): string {
  if (length < 1) {
    return '';
  }

  return generate({
    length,
    charset: 'alphanumeric',
  });
}
