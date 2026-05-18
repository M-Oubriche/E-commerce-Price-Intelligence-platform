export enum UserRole {
  CLIENT = 'CLIENT',
  RESELLER = 'RESELLER'
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  organization: string;
}
