/**
 * Voice Synthesizer Types
 *
 * Centralized constant for Vocaloid and other voice synthesizer types
 * included in rankings and crawler filters.
 */
export const INCLUDED_VOICE_SYNTHESIZER_TYPES = [
  'Vocaloid',
  'UTAU',
  'SynthesizerV',
  'CeVIO',
  'VOICEVOX',
  'AIVOICE',
  'VoiSona',
  'Voiceroid',
  'NEUTRINO',
  'ACEVirtualSinger',
] as const;

export type VoiceSynthesizerType = typeof INCLUDED_VOICE_SYNTHESIZER_TYPES[number];
