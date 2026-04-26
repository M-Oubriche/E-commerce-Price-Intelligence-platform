export type UserRole = 'BUYER' | 'SELLER';

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization: string;
}
