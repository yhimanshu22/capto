export interface Recording {
  id: string;
  title: string;
  duration: number; // in seconds
  createdAt: string;
  fileName: string;
  size: number;
  userId?: string;
}

