export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  must_change_password: boolean;
}
