export enum UserRole {
  CLIENT = 'client',
  RESELLER = 'reseller'
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization: string;
}
