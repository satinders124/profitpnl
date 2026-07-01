export type PlaybookSetup = {
  id: string;

  name: string;
  status?: "Active" | "Testing" | "Archived" | string;

  market?: string;
  timeframe?: string;
  directionBias?: string;

  description?: string;

  entryModel?: string;
  invalidation?: string;
  targetModel?: string;
  riskRule?: string;

  rules?: string[];
  mistakesToAvoid?: string[];
  tags?: string[];

  createdAt?: unknown;
  updatedAt?: unknown;
};