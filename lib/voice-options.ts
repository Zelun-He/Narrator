export interface VoiceOption {
  id: string
  name: string
  description: string
  accent: string
  gender: string
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "1",
    name: "Ava Mitchell",
    description: "Warm and engaging female voice, perfect for fiction and memoirs.",
    accent: "American",
    gender: "Female",
  },
  {
    id: "2",
    name: "James Hartley",
    description: "Deep, authoritative male voice ideal for non-fiction and business books.",
    accent: "British",
    gender: "Male",
  },
  {
    id: "3",
    name: "Sofia Reyes",
    description: "Soft, soothing voice with a gentle cadence for romance and poetry.",
    accent: "American",
    gender: "Female",
  },
  {
    id: "4",
    name: "Liam Chen",
    description: "Energetic and youthful voice, great for YA and sci-fi genres.",
    accent: "Australian",
    gender: "Male",
  },
  {
    id: "5",
    name: "Eleanor Voss",
    description: "Sophisticated and clear, excellent for literary fiction and drama.",
    accent: "British",
    gender: "Female",
  },
  {
    id: "6",
    name: "Marcus Obi",
    description: "Rich, resonant voice with natural storytelling cadence.",
    accent: "American",
    gender: "Male",
  },
]
