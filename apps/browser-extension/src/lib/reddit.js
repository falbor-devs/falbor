// Read-only Reddit DOM adapter for the autonomous agent.
//
// It only reads the page the user is already viewing. It never clicks,
// submits, votes, or navigates; the background agent decides navigation with
// the backend. Selectors are kept here in priority order because Reddit
// changes markup often. Concatenated with text.js and content.js at build
// time, so helpers below run inside the same IIFE scope.

const REDDIT_THREAD_PATTERN = /^\/r\/([^/]+)\/comments\/([a-z0-9]+)/i;
const FEED_CANDIDATE_LIMIT = 60;
const THREAD_BODY_LIMIT = 4000;
const COMMENT_LIMIT = 12;
const COMMENT_BODY_LIMIT = 1200;

const REDDIT_SELECTORS = {
  postNode: 'shreddit-post, div[data-testid="post-container"]',
  commentNode: 'shreddit-comment, div[data-testid="comment"]',
  commentBody: '[slot="comment"], [data-testid="comment"] .md, div[data-testid="comment"] p',
  titleSlot: '[slot="title"], h1, h3',
  bodySlots: '[slot="text-body"], [data-post-click-location="text-body"], [data-testid="post-content"], .md',
  loginForm:
    'faceplate-form[action*="login"], form[action*="login"], input[name="username"][autocomplete="username"]',
  challengeFrame: 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="challenges.cloudflare"]',
};

function redditPathContext() {
  const match = REDDIT_THREAD_PATTERN.exec(location.pathname || '');
  if (match) {
    return { isThread: true, subreddit: match[1].toLowerCase(), postId: match[2].toLowerCase() };
  }
  const subMatch = /^\/r\/([^/]+)/i.exec(location.pathname || '');
  return {
    isThread: false,
    subreddit: subMatch ? subMatch[1].toLowerCase() : null,
    postId: null,
  };
}

function attributeOf(node, names) {
  try {
    for (const name of names) {
      const value = node.getAttribute && node.getAttribute(name);
      if (value != null && String(value).trim()) return String(value).trim();
    }
  } catch (_) {
    return null;
  }
  return null;
}

function parseIntegerish(value) {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase().replace(/,/g, '');
  const match = /^(-?\d+(?:\.\d+)?)([km])?$/.exec(raw);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const multiplier = match[2] === 'k' ? 1000 : match[2] === 'm' ? 1000000 : 1;
  return Math.round(base * multiplier);
}

function postIdFromUrl(url) {
  const match = /\/comments\/([a-z0-9]+)/i.exec(String(url || ''));
  return match ? match[1].toLowerCase() : null;
}

function normalizeBareId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const prefixed = /^t3_([a-z0-9]+)$/.exec(raw);
  if (prefixed) return prefixed[1];
  return /^[a-z0-9]{4,12}$/.test(raw) ? raw : null;
}

function subredditFromValue(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^\/?r\//, '');
  return /^[a-z0-9_]{2,21}$/.test(raw) ? raw : null;
}

function absoluteRedditUrl(href) {
  if (!href) return null;
  try {
    const url = new URL(href, location.origin);
    if (!/(^|\.)reddit\.com$/i.test(url.hostname)) return null;
    if (!/\/comments\//.test(url.pathname)) return null;
    return url.origin + url.pathname.replace(/\/+$/, '') + '/';
  } catch (_) {
    return null;
  }
}

function feedCandidateFromNode(node) {
  const permalink =
    attributeOf(node, ['permalink', 'content-href']) ||
    (() => {
      try {
        const anchor = node.querySelector && node.querySelector('a[href*="/comments/"]');
        return anchor && anchor.getAttribute('href');
      } catch (_) {
        return null;
      }
    })();
  const url = absoluteRedditUrl(permalink);
  if (!url) return null;

  const nodeId = attributeOf(node, ['id', 'data-fullname', 'thingid', 'thingId']);
  const externalId = normalizeBareId(nodeId) || postIdFromUrl(url);
  if (!externalId) return null;

  const subreddit =
    subredditFromValue(attributeOf(node, ['subreddit-prefixed-name', 'subreddit-name', 'data-subreddit'])) ||
    subredditFromValue((/\/r\/([^/]+)\//i.exec(url) || [])[1]);
  if (!subreddit) return null;

  let title = attributeOf(node, ['post-title', 'data-title']);
  if (!title) {
    try {
      const titleNode = node.querySelector && node.querySelector(REDDIT_SELECTORS.titleSlot);
      title = titleNode ? collapseWhitespace(titleNode.innerText || titleNode.textContent) : null;
    } catch (_) {
      title = null;
    }
  }

  return {
    externalId,
    url,
    subreddit,
    title: title ? collapseWhitespace(title).slice(0, 300) : undefined,
  };
}

function extractFeedCandidates() {
  let nodes = [];
  try {
    nodes = Array.from(document.querySelectorAll(REDDIT_SELECTORS.postNode));
  } catch (_) {
    return { ok: false, error: 'The Reddit listing could not be read.' };
  }
  const candidates = [];
  const seen = new Set();
  for (const node of nodes) {
    if (candidates.length >= FEED_CANDIDATE_LIMIT) break;
    const candidate = feedCandidateFromNode(node);
    if (!candidate || seen.has(candidate.externalId)) continue;
    seen.add(candidate.externalId);
    candidates.push(candidate);
  }
  return {
    ok: true,
    data: { candidates, sourceSubreddit: redditPathContext().subreddit },
  };
}

// Reddit embeds an invisible reCAPTCHA frame (visibility: hidden) on every
// normal page, so the frame alone means nothing. Only a visible challenge
// widget (reCAPTCHA/hCaptcha/Turnstile) counts as human verification.
function redditVisibleChallengeFrame() {
  let nodes = [];
  try {
    nodes = Array.from(document.querySelectorAll(REDDIT_SELECTORS.challengeFrame));
  } catch (_) {
    return null;
  }
  for (const node of nodes) {
    try {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const rect = node.getBoundingClientRect();
      if (rect.width >= 100 && rect.height >= 40) return node;
    } catch (_) {
      // Keep scanning the remaining frames.
    }
  }
  return null;
}

function extractThreadObservation() {
  const ctx = redditPathContext();
  if (!ctx.isThread || !ctx.postId) {
    return { ok: false, error: 'This Reddit tab does not show a discussion page.' };
  }

  let postNode = null;
  try {
    postNode = document.querySelector(REDDIT_SELECTORS.postNode);
  } catch (_) {
    postNode = null;
  }

  const pageText = collapseWhitespace(document.body ? document.body.innerText || '' : '');
  const loginForm = (() => {
    try {
      return !!document.querySelector(REDDIT_SELECTORS.loginForm);
    } catch (_) {
      return false;
    }
  })();
  const challengeText =
    /verify (that )?you are (a )?human|are you a robot|unusual traffic|please complete the (security )?check/i.test(
      pageText,
    );

  let title = postNode ? attributeOf(postNode, ['post-title', 'data-title']) : null;
  if (!title) {
    try {
      const heading = document.querySelector('h1');
      title = heading ? collapseWhitespace(heading.innerText || heading.textContent) : null;
    } catch (_) {
      title = null;
    }
  }
  if (!title) return { ok: false, error: 'The discussion title could not be read from the page.' };

  let body = null;
  if (postNode) {
    try {
      const bodyNode = postNode.querySelector(REDDIT_SELECTORS.bodySlots);
      body = bodyNode ? collapseWhitespace(bodyNode.innerText || bodyNode.textContent) : null;
    } catch (_) {
      body = null;
    }
  }

  const subreddit =
    subredditFromValue(attributeOf(postNode, ['subreddit-prefixed-name', 'subreddit-name'])) || ctx.subreddit;

  const comments = [];
  try {
    const commentNodes = Array.from(document.querySelectorAll(REDDIT_SELECTORS.commentNode));
    for (const node of commentNodes) {
      if (comments.length >= COMMENT_LIMIT) break;
      let text = '';
      try {
        const bodyNode = node.querySelector(REDDIT_SELECTORS.commentBody);
        text = collapseWhitespace(bodyNode ? bodyNode.innerText || bodyNode.textContent : node.innerText || '');
      } catch (_) {
        text = '';
      }
      if (!text || text.length < 2) continue;
      comments.push({
        author: attributeOf(node, ['author']) ? String(attributeOf(node, ['author'])).slice(0, 100) : null,
        body: text.slice(0, COMMENT_BODY_LIMIT),
        score: parseIntegerish(attributeOf(node, ['score'])),
      });
    }
  } catch (_) {
    comments.length = 0;
  }

  const locked =
    !!attributeOf(postNode, ['locked']) ||
    /comments are locked|commenting is locked|cannot comment on this post/i.test(pageText);
  const archived =
    !!attributeOf(postNode, ['archived']) || /post is archived|comments are archived|archived post/i.test(pageText);
  const removed = /\bsorry, this post was (deleted|removed)\b|removed by (a )?moderator/i.test(pageText);
  const verificationRequired = !!redditVisibleChallengeFrame() || (challengeText && !postNode);
  const notSignedIn = loginForm || /you need to log in to continue|log in to comment/i.test(pageText);

  return {
    ok: true,
    data: {
      thread: {
        externalId: ctx.postId,
        url: location.origin + location.pathname.replace(/\/+$/, '') + '/',
        subreddit,
        title: collapseWhitespace(title).slice(0, 300),
        body: body ? body.slice(0, THREAD_BODY_LIMIT) : null,
        author: attributeOf(postNode, ['author']) ? String(attributeOf(postNode, ['author'])).slice(0, 100) : null,
        score: parseIntegerish(attributeOf(postNode, ['score'])),
        numComments: parseIntegerish(attributeOf(postNode, ['comment-count'])),
        postedAt: attributeOf(postNode, ['created-timestamp', 'created']),
        comments,
        flags: { locked, archived, removed, verificationRequired, notSignedIn },
      },
    },
  };
}

// --- Interaction layer -----------------------------------------------------
//
// Everything below performs real interactions in the user's existing Reddit
// tab: locating posts on the rendered listing, scrolling the page, waiting for
// new content to render, and verifying the resulting page state. Navigation
// itself (location.assign / history.back) is executed by content.js after the
// target has been located and highlighted here.

const FEED_POST_GROWTH_POLL_MS = 400;

function redditIsThreadPath(pathname) {
  return REDDIT_THREAD_PATTERN.test(String(pathname || ''));
}

function redditListingContext() {
  const path = String((typeof location !== 'undefined' && location.pathname) || '');
  if (redditIsThreadPath(path)) return { isListing: false, subreddit: null };
  const match = /^\/r\/([^/]+)(?:\/(?:new|hot|top|rising|controversial|best)(?:\/.*)?)?\/?$/i.exec(path);
  return { isListing: !!match, subreddit: match ? match[1].toLowerCase() : null };
}

function feedPostNodes() {
  try {
    return Array.from(document.querySelectorAll(REDDIT_SELECTORS.postNode));
  } catch (_) {
    return [];
  }
}

function findPostElementById(postId) {
  const wanted = normalizeBareId(postId);
  if (!wanted) return null;
  for (const node of feedPostNodes()) {
    const raw = attributeOf(node, ['id', 'data-fullname', 'thingid', 'thingId']) || '';
    if (normalizeBareId(raw) === wanted) return node;
    const permalink = attributeOf(node, ['permalink', 'content-href']) || '';
    if (postIdFromUrl(permalink) === wanted) return node;
    try {
      const anchor = node.querySelector && node.querySelector('a[href*="/comments/"]');
      if (anchor && postIdFromUrl(anchor.getAttribute('href')) === wanted) return node;
    } catch (_) {
      // Keep scanning the remaining nodes.
    }
  }
  return null;
}

function countFeedPosts() {
  return feedPostNodes().length;
}

function pageScrollHeight() {
  try {
    const doc = document.documentElement;
    return Math.max(doc ? doc.scrollHeight : 0, document.body ? document.body.scrollHeight : 0);
  } catch (_) {
    return 0;
  }
}

function pageScrollTop() {
  try {
    return window.scrollY || (document.documentElement && document.documentElement.scrollTop) || 0;
  } catch (_) {
    return 0;
  }
}

function delayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Scroll the real page and wait until new content actually renders. Resolves
// with what really happened so the caller can report a verified outcome.
async function scrollFeedAndWaitForGrowth(timeoutMs) {
  const postsBefore = countFeedPosts();
  const heightBefore = pageScrollHeight();
  const scrollBefore = pageScrollTop();
  try {
    window.scrollBy({ top: Math.round((window.innerHeight || 800) * 0.9), behavior: 'smooth' });
  } catch (_) {
    try {
      window.scrollBy(0, Math.round((window.innerHeight || 800) * 0.9));
    } catch (_) {
      // Scrolling is unavailable in this page context.
    }
  }

  const deadline = Date.now() + (timeoutMs || 6000);
  let grew = false;
  while (Date.now() < deadline) {
    await delayMs(FEED_POST_GROWTH_POLL_MS);
    const postsNow = countFeedPosts();
    const heightNow = pageScrollHeight();
    if (postsNow > postsBefore || heightNow > heightBefore + 200) {
      grew = true;
      break;
    }
  }
  return {
    grew,
    postsBefore,
    postsAfter: countFeedPosts(),
    heightBefore,
    heightAfter: pageScrollHeight(),
    scrolledBy: Math.max(0, pageScrollTop() - scrollBefore),
  };
}

// Wait until the discussion page has actually rendered its content.
async function waitForThreadReady(timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 20000);
  const ready = () => {
    try {
      const heading = document.querySelector('h1');
      const hasTitle = !!heading && collapseWhitespace(heading.innerText || heading.textContent).length > 0;
      const hasBody = !!document.querySelector(REDDIT_SELECTORS.postNode);
      return hasTitle && hasBody;
    } catch (_) {
      return false;
    }
  };
  while (Date.now() < deadline) {
    if (ready()) return true;
    await delayMs(500);
  }
  return ready();
}

function threadTitleFromPage() {
  try {
    const heading = document.querySelector('h1');
    return heading ? collapseWhitespace(heading.innerText || heading.textContent).slice(0, 300) : null;
  } catch (_) {
    return null;
  }
}

// The listing the extension should return to after inspecting a discussion.
function listingUrlForSubreddit(subreddit) {
  const name = subredditFromValue(subreddit);
  if (!name) return null;
  let origin = 'https://www.reddit.com';
  try {
    if (typeof location !== 'undefined' && location.origin && /^https?:$/i.test(location.protocol)) {
      origin = location.origin;
    }
  } catch (_) {
    // Fall back to the canonical origin.
  }
  return origin + '/r/' + encodeURIComponent(name) + '/new/';
}
