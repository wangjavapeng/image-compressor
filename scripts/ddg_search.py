#!/usr/bin/env python3
"""DuckDuckGo lite search - no API key required."""

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def search(query: str, max_results: int = 8) -> list[dict]:
    q = urllib.parse.urlencode({"q": query})
    url = f"https://lite.duckduckgo.com/lite/?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    results = []
    # Parse DuckDuckGo lite HTML
    # Each result is in a <tr class="result-link"> followed by <tr class="result-snippet">
    link_pattern = re.compile(
        r'<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.DOTALL
    )
    snippet_pattern = re.compile(
        r'<td[^>]+class="result-snippet"[^>]*>\s*(.*?)\s*</td>', re.DOTALL
    )

    links = link_pattern.findall(html)
    snippets = snippet_pattern.findall(html)

    # Also try alternative pattern
    if not links:
        link_pattern2 = re.compile(
            r'<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
            re.DOTALL,
        )
        links = link_pattern2.findall(html)

    for i in range(min(max_results, len(links))):
        href, title = links[i]
        # Clean title
        title = re.sub(r"<[^>]+>", "", title).strip()
        # Skip DuckDuckGo internal links
        if "duckduckgo.com" in href and "/l/" not in href:
            continue
        result = {"title": title, "url": href}
        if i < len(snippets):
            result["snippet"] = re.sub(r"<[^>]+>", "", snippets[i]).strip()
        results.append(result)

    return results[:max_results]


def main():
    parser = argparse.ArgumentParser(description="DuckDuckGo search (no API key)")
    parser.add_argument("query", nargs="+", help="Search query")
    parser.add_argument("--max", "-n", type=int, default=8, help="Max results")
    parser.add_argument("--json", "-j", action="store_true", help="JSON output")
    parser.add_argument("--md", action="store_true", help="Markdown output")
    args = parser.parse_args()
    query = " ".join(args.query)
    results = search(query, args.max)

    if not results:
        print("No results found.")
        sys.exit(1)

    if args.json:
        print(json.dumps({"query": query, "results": results}, ensure_ascii=False, indent=2))
    elif args.md:
        print(f"## {query}\n")
        for r in results:
            print(f"- **{r['title']}**")
            print(f"  {r['url']}")
            if r.get("snippet"):
                print(f"  > {r['snippet']}")
            print()
    else:
        for i, r in enumerate(results, 1):
            print(f"{i}. {r['title']}")
            print(f"   {r['url']}")
            if r.get("snippet"):
                print(f"   {r['snippet']}")
            print()


if __name__ == "__main__":
    main()
