export interface BrandMentionPost {
    id?: string;
    workspaceId?: string;
    platform: string;
    title: string;
    content: string;
    url?: string;
    author?: string;
    likes: number;
    comments: number;
    brandKeyword: string;
    sentiment?: 'positive' | 'neutral' | 'negative' | string;
    relevanceReason?: string;
    postedAt?: string;
    createdAt?: string;
}
