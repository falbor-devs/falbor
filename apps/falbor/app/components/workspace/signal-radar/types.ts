export interface SignalPost {
    id?: string;
    workspaceId?: string;
    platform: string;
    title: string;
    content: string;
    url?: string;
    author?: string;
    likes: number;
    comments: number;
    relevanceScore: number;
    relevanceReason?: string;
    painPoints?: string[];
    postedAt?: string;
    createdAt?: string;
}
