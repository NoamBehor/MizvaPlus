let previewBootstrapped = false;

export function isDevPreviewBootstrapped(): boolean {
  return previewBootstrapped;
}

export function markDevPreviewBootstrapped(): void {
  previewBootstrapped = true;
}

export function resetDevPreviewBootstrapFlag(): void {
  previewBootstrapped = false;
}
