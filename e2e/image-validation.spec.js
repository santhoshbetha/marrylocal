import { test, expect } from '@playwright/test';
import { validateProfileImage } from '../src/lib/imageValidation';

const fakeFile = (type, size) => ({ type, size });

test('rejects a missing file', () => {
  expect(() => validateProfileImage(null)).toThrow('No file selected.');
});

test('rejects unsupported formats using the baseline error copy', () => {
  expect(() => validateProfileImage(fakeFile('image/gif', 1024))).toThrow(
    'Format error. Allowed file formats are: jpeg, png, webp',
  );
});

test('rejects files that exceed the 5MB default ceiling', () => {
  expect(() => validateProfileImage(fakeFile('image/png', 5 * 1024 * 1024 + 1))).toThrow(
    'File is too large. Image parameters must fit inside a 5MB limit.',
  );
});

test('accepts the baseline defaults including webp', () => {
  expect(validateProfileImage(fakeFile('image/webp', 1024))).toBe(true);
  expect(validateProfileImage(fakeFile('image/jpeg', 5 * 1024 * 1024))).toBe(true);
});

test('honours caller-supplied type and size constraints', () => {
  expect(() =>
    validateProfileImage(fakeFile('image/webp', 1024), {
      allowedTypes: ['image/jpeg', 'image/png'],
    }),
  ).toThrow('Format error. Allowed file formats are: jpeg, png');

  expect(() =>
    validateProfileImage(fakeFile('image/png', 3 * 1024 * 1024), {
      maxSize: 2 * 1024 * 1024,
    }),
  ).toThrow('File is too large. Image parameters must fit inside a 2MB limit.');
});
