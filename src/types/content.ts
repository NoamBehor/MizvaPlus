/** Shared provenance metadata for curated religious content. */
export interface ContentSource {
  sourceTitle: string;
  sourceAuthor?: string;
  sourceReference: string;
}

export type ContentReviewStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'published';

export interface ContentReviewMetadata {
  reviewedAt?: string;
  version?: string;
  status?: ContentReviewStatus;
}

export function formatContentSource(source: ContentSource): string {
  const parts = [source.sourceTitle];
  if (source.sourceAuthor) {
    parts.push(source.sourceAuthor);
  }
  parts.push(source.sourceReference);
  return parts.join(' · ');
}
