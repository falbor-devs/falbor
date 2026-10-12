export type ActiveTab = 'tables' | 'auth' | 'storage' | 'functions' | 'logs' | 'sql';

export interface DbTable {
  schema: string;
  name: string;
  fullName: string;
}

export interface DbUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned_until: string | null;
  email_confirmed_at: string | null;
}

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
}

export interface StorageFile {
  name: string;
  created_at: string;
}

export interface DbFunction {
  name: string;
  schema: string;
  type: string;
  return_type: string;
}

export interface TableData {
  rows: any[];
  columns: string[];
}
