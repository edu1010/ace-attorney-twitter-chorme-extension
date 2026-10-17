export interface Tweet {
  id: string;
  username: string;
  displayName: string;
  text: string;
  url: string;
  parentId?: string;
  order: number;
  unavailable: boolean;
}
export interface Conversation {
  focusId: string;
  sourceUrl: string;
  tweets: Tweet[];
  warnings: string[];
}
export interface Character {
  id: string;
  name: string;
  location: 'left' | 'right' | 'center' | 'judge';
  gender: string;
  neutral: string;
  dramatic: string;
  objection: string;
}
export interface AssetManifest {
  characters: Character[];
  priority: string[];
  relaxed: string;
  tense: string;
}
