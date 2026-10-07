export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  accent: string;
  gender: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "1",
    name: "LJ (Default)",
    description:
      "Clear, natural voice perfect for narrating any audiobook genre.",
    accent: "American",
    gender: "Neutral",
  },
];
