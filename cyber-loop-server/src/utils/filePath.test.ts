
import { describe, it, expect } from 'vitest';
import { isAllowedFilePath } from './filePath';

describe('isAllowedFilePath', () => {
  it('allows PDFs/ prefix', () => {
    expect(isAllowedFilePath('PDFs/sample.pdf')).toBe(true);
  });
  it('allows Images/ prefix', () => {
    expect(isAllowedFilePath('Images/photo.png')).toBe(true);
  });
  it('rejects path traversal', () => {
    expect(isAllowedFilePath('../PDFs/escape.pdf')).toBe(false);
  });
  it('rejects empty or invalid input', () => {
    expect(isAllowedFilePath('')).toBe(false);
    expect(isAllowedFilePath(null)).toBe(false);
  });
});
