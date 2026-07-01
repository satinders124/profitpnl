export type JournalEntry = {
  id: string;
  date: string;
  mood?: string;
  notes?: string;
  text?: string;
  entry?: string;
  tags?: string[];
  createdAt?: unknown;
};
