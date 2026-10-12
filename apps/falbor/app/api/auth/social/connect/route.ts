import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') || 'Twitter';

  const twitterClientId = process.env.TWITTER_CLIENT_ID || 'FALBOR_TWITTER_ID';
  const redditClientId = process.env.REDDIT_CLIENT_ID || 'FALBOR_REDDIT_ID';
  const linkedinClientId = process.env.LINKEDIN_CLIENT_ID || 'FALBOR_LINKEDIN_ID';

  const OAUTH_URLS: Record<string, string> = {
    Twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${twitterClientId}&redirect_uri=` + encodeURIComponent('https://localhost:3000/api/auth/callback/social?platform=Twitter') + '&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=falbor_oauth_state',
    Reddit: `https://www.reddit.com/api/v1/authorize?client_id=${redditClientId}&response_type=code&state=falbor_oauth_state&redirect_uri=` + encodeURIComponent('https://localhost:3000/api/auth/callback/social?platform=Reddit') + '&duration=permanent&scope=identity%20submit',
    LinkedIn: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=` + encodeURIComponent('https://localhost:3000/api/auth/callback/social?platform=LinkedIn') + '&state=falbor_oauth_state&scope=w_member_social%20openid%20profile%20email',
  };

  const redirectUrl = OAUTH_URLS[platform] || OAUTH_URLS.Twitter;
  return NextResponse.redirect(redirectUrl);
}
