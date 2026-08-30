export type ScreenBlock = {
  component: string;
  props: Record<string, unknown>;
};

export type ScreenConfig = {
  id: string;
  maxWidth?: 'default' | 'narrow';
  blocks: ScreenBlock[];
};

export type ScreenContext = {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
  session?: Record<string, string>;
};
