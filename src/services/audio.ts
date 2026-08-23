import * as Speech from 'expo-speech';

import { Platform } from 'react-native';



const HEBREW_LANGUAGE = 'he-IL';



let isPaused = false;



export type AudioPlaybackState = 'idle' | 'speaking' | 'paused';



/** Whether pause/resume is supported on the current platform. */

export const supportsTtsPauseResume = Platform.OS === 'android';



export async function speakHebrew(text: string): Promise<void> {

  await stopSpeaking();



  if (!text.trim()) {

    return;

  }



  isPaused = false;



  return new Promise<void>((resolve, reject) => {

    Speech.speak(text, {

      language: HEBREW_LANGUAGE,

      onDone: () => {

        isPaused = false;

        resolve();

      },

      onStopped: () => {

        isPaused = false;

        resolve();

      },

      onError: (error) => {

        isPaused = false;

        reject(error);

      },

    });

  });

}



export function stopSpeaking(): void {

  Speech.stop();

  isPaused = false;

}



export function pauseSpeaking(): void {

  if (!supportsTtsPauseResume) {

    return;

  }



  Speech.pause();

  isPaused = true;

}



export function resumeSpeaking(): void {

  if (!supportsTtsPauseResume) {

    return;

  }



  Speech.resume();

  isPaused = false;

}



export async function isSpeaking(): Promise<boolean> {

  const speaking = await Speech.isSpeakingAsync();

  return speaking && !isPaused;

}



export function getPlaybackState(): AudioPlaybackState {

  if (isPaused) {

    return 'paused';

  }



  return 'idle';

}



export async function getAsyncPlaybackState(): Promise<AudioPlaybackState> {

  const speaking = await Speech.isSpeakingAsync();

  if (speaking && isPaused) {

    return 'paused';

  }

  if (speaking) {

    return 'speaking';

  }

  return 'idle';

}



/**

 * Stops current speech and starts new content.

 * Prevents overlapping audio requests.

 */

export async function playHebrewContent(content: string): Promise<void> {

  stopSpeaking();

  await speakHebrew(content);

}



export async function stopAudioPlayback(): Promise<void> {

  stopSpeaking();

}

