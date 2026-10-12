# import os
# import re
# import json
# import uuid
# import hashlib
# import time
# import requests
# from threading import Thread

# import torch
# from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
# from flask import Flask, request, jsonify, Response
# from bs4 import BeautifulSoup
# from playwright.sync_api import sync_playwright

# try:
#     from duckduckgo_search import DDGS
# except ImportError:
#     print("WARNING: duckduckgo-search not installed.")

# app = Flask(__name__)

# # --- MODEL CONFIGURATION ---
# MODEL_PATH = "HuggingFaceTB/SmolLM2-360M-Instruct"
# device = "cuda" if torch.cuda.is_available() else "cpu"
# tokenizer = None
# model = None

# print("--- Xb36 AI Bridge ---")
# print(f"Loading model: {MODEL_PATH}")
# print(f"Target device: {device}")

# try:
#     tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
#     model = AutoModelForCausalLM.from_pretrained(
#         MODEL_PATH,
#         dtype=torch.float16 if device == "cuda" else torch.float32,
#         device_map="auto" if device == "cuda" else None,
#         trust_remote_code=True
#     )
#     if device == "cpu":
#         model = model.to(device)
#     print("--- Model Loaded Successfully ---")
# except Exception as e:
#     print(f"\n❌ ERROR LOADING MODEL: {e}")

# active_jobs = {}

# # ──────────────────────────────────────────────
# #  Security info loader
# # ──────────────────────────────────────────────
# def load_security_info():
#     info_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "security", "info")
#     info_text = ""
#     if os.path.exists(info_dir):
#         for filename in os.listdir(info_dir):
#             filepath = os.path.join(info_dir, filename)
#             if os.path.isfile(filepath):
#                 try:
#                     with open(filepath, 'r', encoding='utf-8') as f:
#                         info_text += f"\n--- Content from {filename} ---\n"
#                         info_text += f.read() + "\n"
#                 except Exception as e:
#                     print(f"Failed to read {filename}: {e}")
#     return info_text

# # ──────────────────────────────────────────────
# #  URL extractor / intent detector
# # ──────────────────────────────────────────────
# SITE_SHORTCUTS = {
#     "youtube":    "https://www.youtube.com",
#     "google":     "https://www.google.com",
#     "wikipedia":  "https://www.wikipedia.org",
#     "reddit":     "https://www.reddit.com",
#     "twitter":    "https://www.twitter.com",
#     "x.com":      "https://www.x.com",
#     "github":     "https://www.github.com",
#     "instagram":  "https://www.instagram.com",
#     "facebook":   "https://www.facebook.com",
#     "amazon":     "https://www.amazon.com",
#     "netflix":    "https://www.netflix.com",
#     "twitch":     "https://www.twitch.tv",
# }

# def detect_navigation_intent(message: str):
#     """
#     Returns (url, search_query_or_None) if the message is asking to visit a website.
#     Returns (None, None) if no navigation intent detected.
#     """
#     msg_lower = message.lower()

#     # Check for explicit URL
#     url_match = re.search(r'https?://[^\s]+', message)
#     if url_match:
#         return url_match.group(0).rstrip('.,)'), None

#     nav_keywords = ["go to", "open", "visit", "navigate to", "browse to",
#                     "show me", "take me to", "search on", "look for on",
#                     "find on", "search for on", "search youtube", "check on",
#                     "look up on", "go on", "open up", "take a screenshot of", "screenshot of",
#                     "picture of", "take a picture of", "search", "google"]
#     has_nav_intent = any(kw in msg_lower for kw in nav_keywords)

#     if not has_nav_intent:
#         return None, None

#     # 1. Check known site shortcuts
#     for site_key, site_url in SITE_SHORTCUTS.items():
#         if site_key in msg_lower:
#             # Try to find a search query in the message
#             search_match = re.search(
#                 r'(?:search(?:\s+for)?|look\s+for|find|about|for)\s+["\']?(.+?)["\']?'
#                 r'(?:\s+on\s+' + re.escape(site_key) + r')?$',
#                 msg_lower
#             )
#             if search_match:
#                 query = search_match.group(1).strip()
#                 query = re.sub(r'\s+on\s+' + re.escape(site_key) + r'$', '', query).strip()
#                 if query and len(query) > 2:
#                     encoded_q = requests.utils.quote(query)
#                     if site_key == "youtube":
#                         return f"https://www.bing.com/videos/search?q={encoded_q}+site:youtube.com", query
#                     elif site_key == "google":
#                         return f"https://www.google.com/search?q={encoded_q}", query
#                     else:
#                         return site_url, query
#             if site_key == "youtube":
#                 return "https://www.bing.com/videos/search?q=site:youtube.com", None
#             return site_url, None

#     # 2. Universal Fallback: If no shortcut matched, extract the target and search Google
#     for kw in nav_keywords:
#         if kw in msg_lower:
#             target = msg_lower.split(kw, 1)[1].strip()
#             # Clean up trailing instructions
#             target = re.sub(r'(and take a screenshot|and capture it|for me|please).*$', '', target).strip()
#             if target:
#                 # If target looks like a domain (e.g. falbor.com), go directly
#                 if "." in target and " " not in target:
#                     return f"https://{target}", target
                
#                 # Otherwise, search Google for it
#                 encoded_q = requests.utils.quote(target)
#                 return f"https://www.google.com/search?q={encoded_q}", target

#     return None, None

# # ──────────────────────────────────────────────
# #  Browser fetcher with screenshot
# # ──────────────────────────────────────────────
# def fetch_website(url: str):
#     """Navigate to a URL using Playwright, return (text_content, screenshot_url, links)."""
#     print(f"[Browser] Navigating to: {url}")
#     try:
#         with sync_playwright() as p:
#             browser = p.chromium.launch(headless=True)
#             context = browser.new_context(
#                 viewport={"width": 1280, "height": 800},
#                 user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
#             )
#             page = context.new_page()
#             page.goto(url, timeout=20000, wait_until="domcontentloaded")
#             page.wait_for_timeout(2500)

#             # Take screenshot into memory (no disk write needed)
#             screenshot_bytes = page.screenshot(full_page=False)
#             print(f"[Browser] Screenshot taken ({len(screenshot_bytes)} bytes)")

#             # Text content
#             html = page.content()
#             soup = BeautifulSoup(html, "html.parser")
#             for tag in soup(["script", "style", "nav", "footer", "header"]):
#                 tag.decompose()
#             raw_text = soup.get_text(separator="\n")
#             lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
#             text_content = "\n".join(lines[:100])

#             # Extract notable links
#             links = []
#             for a in soup.find_all("a", href=True, limit=30):
#                 href = a["href"]
#                 label = a.get_text(strip=True)
#                 if label and href.startswith("http") and len(label) > 3:
#                     links.append((label[:80], href))

#             browser.close()

#             # Upload screenshot to Neon via the Next.js API
#             import base64
#             image_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
#             try:
#                 upload_resp = requests.post(
#                     "http://localhost:3000/api/bridge-screenshot",
#                     json={"imageBase64": image_b64, "sourceUrl": url},
#                     timeout=15
#                 )
#                 if upload_resp.ok:
#                     screenshot_id = upload_resp.json().get("id")
#                     screenshot_url = f"/api/bridge-screenshot/{screenshot_id}"
#                     print(f"[Browser] Screenshot saved to Neon: {screenshot_id}")
#                 else:
#                     print(f"[Browser] Upload failed: {upload_resp.text}")
#                     screenshot_url = None
#             except Exception as upload_err:
#                 print(f"[Browser] Upload error: {upload_err}")
#                 screenshot_url = None

#             return text_content, screenshot_url, links
#     except Exception as e:
#         print(f"[Browser] ERROR: {e}")
#         return f"Failed to load page: {e}", None, []


# # ──────────────────────────────────────────────
# #  DuckDuckGo fallback search
# # ──────────────────────────────────────────────
# def execute_web_search(query):
#     print(f"[Search] Querying: {query}")
#     try:
#         results = DDGS().text(query, max_results=5)
#         if not results:
#             return "No results found."
#         out = []
#         for r in results:
#             out.append(f"**{r.get('title')}**\n{r.get('body')}\n🔗 {r.get('href')}")
#         return "\n\n".join(out)
#     except Exception as e:
#         return f"Search failed: {e}"

# # ──────────────────────────────────────────────
# #  Main chat endpoint
# # ──────────────────────────────────────────────
# @app.route('/chat', methods=['POST'])
# def chat():
#     if model is None or tokenizer is None:
#         return jsonify({"response": "Backend Error: Model is not loaded."}), 500

#     data = request.json
#     message = data.get('message', '')
#     history = data.get('history', [])

#     print(f"\n[AI] Request: {message[:60]}...")

#     job_id = hashlib.md5((message + json.dumps(history)).encode()).hexdigest()

#     if job_id not in active_jobs:
#         active_jobs[job_id] = {"buffer": "", "done": False}

#         def generate_worker():
#             job = active_jobs[job_id]

#             try:
#                 # ── Step 1: Detect navigation intent BEFORE calling the model ──
#                 nav_url, search_query = detect_navigation_intent(message)
#                 screenshot_url = None
#                 browser_context = ""

#                 if nav_url:
#                     # Friendly site name for the UI
#                     site_name = "the website"
#                     if "youtube" in nav_url or "bing.com/video" in nav_url:
#                         site_name = "YouTube"
#                     elif "google.com" in nav_url:
#                         site_name = "Google"
                        
#                     # Pre-generate a real thought process using the model
#                     job["buffer"] += "<think>"
                    
#                     pre_prompt = (
#                         f"<|im_start|>system\nYou are an AI Web Agent. You are about to browse {site_name} to fulfill the user's request.\n"
#                         f"Briefly explain your plan (what you will search for or look at) in 1 to 2 short sentences. Do not provide the final answer yet, just your thought process.<|im_end|>\n"
#                         f"<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n"
#                     )
#                     pre_inputs = tokenizer(pre_prompt, return_tensors="pt").to(device)
#                     pre_streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
#                     pre_kwargs = dict(
#                         **pre_inputs,
#                         streamer=pre_streamer,
#                         max_new_tokens=80,
#                         do_sample=True,
#                         temperature=0.7,
#                     )
                    
#                     pre_thread = Thread(target=model.generate, kwargs=pre_kwargs)
#                     pre_thread.start()
#                     for new_text in pre_streamer:
#                         job["buffer"] += new_text
#                     pre_thread.join()
                    
#                     job["buffer"] += "</think>\n\n"
                    
#                     # Now execute the actual browse
#                     page_text, screenshot_url, links = fetch_website(nav_url)

#                     if screenshot_url:
#                         job["buffer"] += f"<browser_navigate url=\"{nav_url}\" />\n"
#                         job["buffer"] += f"<screenshot url=\"{screenshot_url}\" title=\"{site_name}\" />\n\n"

#                     links_text = ""
#                     if links:
#                         links_text = "Links found on the page:\n"
#                         for label, href in links[:15]:
#                             links_text += f"- [{label}]({href})\n"
#                         # We no longer dump links straight to the user buffer. We only give them to the AI below.

#                     browser_context = (
#                         f"[BROWSER RESULT]\n"
#                         f"URL visited: {nav_url}\n"
#                         f"Page content:\n{page_text}\n"
#                         f"{links_text}"
#                     )

#                 # ── Step 2: Build prompt for the language model ──
#                 security_info = load_security_info()

#                 system_prompt = (
#                     "You are an advanced AI Web Agent. You are helpful, professional and thorough.\n"
#                     "When you receive [BROWSER RESULT] in your context, you MUST summarize what you found clearly.\n"
#                     "CRITICAL: You MUST ALWAYS include the direct URLs/links to the specific items or videos you found so the user can click them. Use markdown link format: [Video Title](https://...)\n"
#                     "Always give detailed, useful responses. Never be vague or give one-line answers.\n"
#                 )
#                 if security_info:
#                     system_prompt += f"\nKNOWLEDGE BASE:\n{security_info}\n"

#                 prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n"

#                 for msg in history[-6:]:
#                     role = msg.get('role', 'user')
#                     content = msg.get('content', '')
#                     prompt += f"<|im_start|>{role}\n{content}<|im_end|>\n"

#                 if browser_context:
#                     prompt += f"<|im_start|>system\n{browser_context}<|im_end|>\n"

#                 prompt += f"<|im_start|>user\n{message}<|im_end|>\n<|im_start|>assistant\n"

#                 # ── Step 3: Generate model response ──
#                 inputs = tokenizer(prompt, return_tensors="pt").to(device)
#                 streamer = TextIteratorStreamer(
#                     tokenizer, skip_prompt=True, skip_special_tokens=True
#                 )
#                 gen_kwargs = dict(
#                     **inputs,
#                     streamer=streamer,
#                     max_new_tokens=1024,
#                     do_sample=True,
#                     temperature=0.7,
#                     top_p=0.9,
#                     repetition_penalty=1.15,
#                     pad_token_id=tokenizer.eos_token_id,
#                 )
#                 t = Thread(target=model.generate, kwargs=gen_kwargs)
#                 t.start()

#                 for chunk in streamer:
#                     job["buffer"] += chunk

#                 t.join()

#             except Exception as e:
#                 print(f"[Worker] Error: {e}")
#                 import traceback
#                 traceback.print_exc()
#                 job["buffer"] += f"\n\n⚠️ Error: {e}"
#             finally:
#                 job["done"] = True

#         Thread(target=generate_worker, daemon=True).start()

#     # ── Streaming response ──
#     def stream_job():
#         job = active_jobs[job_id]
#         cursor = 0
#         while True:
#             if cursor < len(job["buffer"]):
#                 chunk = job["buffer"][cursor:]
#                 cursor += len(chunk)
#                 yield chunk
#             elif job["done"]:
#                 break
#             else:
#                 time.sleep(0.05)
#         active_jobs.pop(job_id, None)

#     return Response(stream_job(), mimetype='text/plain')


# @app.route('/screenshots/<filename>')
# def serve_screenshot(filename):
#     """Serve screenshots from the bridge itself with CORS headers."""
#     from flask import send_from_directory
#     screenshots_dir = os.path.join(
#         os.path.dirname(os.path.dirname(__file__)), "public", "screenshots"
#     )
#     resp = send_from_directory(screenshots_dir, filename)
#     resp.headers['Access-Control-Allow-Origin'] = '*'
#     return resp

# @app.route('/proxy')
# def proxy():
#     url = request.args.get('url')
#     if not url:
#         return "No url", 400
        
#     headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
#     try:
#         resp = requests.get(url, headers=headers, timeout=10)
#     except Exception as e:
#         return str(e), 500
        
#     # Inject <base> tag
#     content = resp.text
#     base_tag = f'<base href="{url}">'
#     if '<head>' in content.lower():
#         # Case insensitive replace
#         content = re.sub(r'(<head[^>]*>)', r'\1' + base_tag, content, count=1, flags=re.IGNORECASE)
#     else:
#         content = base_tag + content
        
#     excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 
#                         'x-frame-options', 'content-security-policy', 'cross-origin-embedder-policy',
#                         'cross-origin-opener-policy']
                        
#     out_headers = []
#     for name, value in resp.raw.headers.items():
#         if name.lower() not in excluded_headers:
#             out_headers.append((name, value))
            
#     out_headers.append(('Access-Control-Allow-Origin', '*'))
#     out_headers.append(('Cross-Origin-Resource-Policy', 'cross-origin'))
            
#     from flask import Response
#     return Response(content, resp.status_code, out_headers)



# if __name__ == "__main__":
#     app.run(port=8000, debug=False)
