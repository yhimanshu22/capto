import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Recording {
  id: string;
  title: string;
  duration: number; // in seconds
  createdAt: string;
  fileName: string;
  size: number;
  userId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

