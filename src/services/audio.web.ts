export type AudioPlaybackState = 'idle' | 'speaking' | 'paused';

export const supportsTtsPauseResume = false;

export async function speakHebrew(_text: string): Promise<void> {
  // Text-to-speech is not available on web preview.
}

export function stopSpeaking(): void {
  // No-op on web.
}

export function pauseSpeaking(): void {
  // No-op on web.
}

export function resumeSpeaking(): void {
  // No-op on web.
}

export async function isSpeaking(): Promise<boolean> {
  return false;
}

export function getPlaybackState(): AudioPlaybackState {
  return 'idle';
}

export async function getAsyncPlaybackState(): Promise<AudioPlaybackState> {
  return 'idle';
}

export async function playHebrewContent(_content: string): Promise<void> {
  // No-op on web.
}

export async function stopAudioPlayback(): Promise<void> {
  stopSpeaking();
}
