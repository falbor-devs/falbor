export type User = {
  id?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

export type Template = {
  id: string;
  name: string;
  shortDescription?: string;
  description?: string;
  mainImage?: string;
  images?: string[];
  categories?: string[];
  url?: string;
  user?: User;
};

export type Review = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user?: User;
};
