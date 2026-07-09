export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  must_change_password: boolean;
  national_id: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  phone: string | null;
}
