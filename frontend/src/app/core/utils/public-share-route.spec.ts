import { isPublicShareUrl } from './public-share-route';

describe('isPublicShareUrl', () => {
  it.each([
    ['/share/abc123', true],
    ['/share', true],
    ['/shared', false],
    ['/recipes/1', false],
    ['/', false],
  ])('%s → %s', (url, expected) => {
    expect(isPublicShareUrl(url)).toBe(expected);
  });
});
