/**
 * OpenStax URL helpers.
 *
 * OpenStax books read best through their web reader
 * (openstax.org/books/<slug>/pages/…) — instant, mobile-friendly, embeddable.
 * Their direct PDFs are 50–110 MB files that leave browser tabs (and the
 * Android/iOS WebView) hanging on a blank page, so PDFs are offered as a
 * secondary download from each book's details page instead.
 */

const READER_PATTERN =
  /^https:\/\/openstax\.org\/books\/([^/]+)\/pages\/(.+)$/;

/** True when a material URL is an OpenStax web-reader page. */
export function openStaxReaderUrl(url: string): string | null {
  const match = url.match(READER_PATTERN);
  return match ? url : null;
}

/** Canonical details page for an OpenStax book slug (PDF lives there). */
export function openStaxPdfPageUrl(readerUrl: string): string | null {
  const match = readerUrl.match(READER_PATTERN);
  return match
    ? `https://openstax.org/details/books/${match[1]}`
    : null;
}
