#!/usr/bin/env python3
"""Regenerates docs/index.md from the current state of the repository.

Run by the "Docs" GitHub Actions workflow on every push so the MkDocs
site always reflects the latest commit, file layout, and contributors.
"""
import os
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(REPO_ROOT, "docs")
OUTPUT_PATH = os.path.join(DOCS_DIR, "index.md")

EXCLUDE_DIRS = {".git", "site", "docs", "node_modules", "__pycache__"}

EXT_LANGUAGE = {
    ".js": "JavaScript",
    ".html": "HTML",
    ".css": "CSS",
    ".py": "Python",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".json": "JSON",
}

BINARY_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".mp3", ".wav", ".ogg", ".glb", ".gltf"}


def run_git(args):
    result = subprocess.run(
        ["git", "-C", REPO_ROOT, *args],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip()


def get_repo_title():
    index_html = os.path.join(REPO_ROOT, "index.html")
    if os.path.exists(index_html):
        with open(index_html, encoding="utf-8", errors="ignore") as f:
            content = f.read()
        match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip()
    return "Repository Summary"


def walk_files():
    files = []
    for root, dirs, filenames in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]
        for name in filenames:
            path = os.path.join(root, name)
            rel = os.path.relpath(path, REPO_ROOT)
            files.append(rel)
    return sorted(files)


def language_breakdown(files):
    counter = Counter()
    for rel in files:
        ext = os.path.splitext(rel)[1].lower()
        lang = EXT_LANGUAGE.get(ext)
        if not lang:
            continue
        path = os.path.join(REPO_ROOT, rel)
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                counter[lang] += sum(1 for _ in f)
        except OSError:
            continue
    return counter


def format_size(num_bytes):
    for unit in ("B", "KB", "MB", "GB"):
        if num_bytes < 1024:
            return f"{num_bytes:.0f} {unit}" if unit == "B" else f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


def get_recent_commits(limit=10):
    log = run_git(["log", f"-{limit}", "--pretty=format:%h|%an|%ad|%s", "--date=short"])
    commits = []
    for line in log.splitlines():
        parts = line.split("|", 3)
        if len(parts) == 4:
            commits.append(parts)
    return commits


def get_contributors():
    log = run_git(["log", "--pretty=format:%an"])
    counter = Counter(name for name in log.splitlines() if name)
    return counter.most_common()


def get_total_commit_count():
    return run_git(["rev-list", "--count", "HEAD"])


def get_current_branch():
    return run_git(["rev-parse", "--abbrev-ref", "HEAD"])


def build_markdown():
    title = get_repo_title()
    files = walk_files()
    languages = language_breakdown(files)
    commits = get_recent_commits()
    contributors = get_contributors()
    total_commits = get_total_commit_count()
    branch = get_current_branch()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(
        f"*This page is generated automatically from the repository's current state. "
        f"Last updated: **{now}** (branch `{branch}`).*"
    )
    lines.append("")

    lines.append("## Overview")
    lines.append("")
    lines.append(f"- **Total files tracked:** {len(files)}")
    lines.append(f"- **Total commits:** {total_commits}")
    lines.append(f"- **Contributors:** {len(contributors)}")
    lines.append("")

    if languages:
        lines.append("## Language Breakdown (by line count)")
        lines.append("")
        lines.append("| Language | Lines |")
        lines.append("|---|---|")
        for lang, count in languages.most_common():
            lines.append(f"| {lang} | {count} |")
        lines.append("")

    lines.append("## File Listing")
    lines.append("")
    lines.append("| File | Size |")
    lines.append("|---|---|")
    for rel in files:
        size = os.path.getsize(os.path.join(REPO_ROOT, rel))
        lines.append(f"| `{rel}` | {format_size(size)} |")
    lines.append("")

    lines.append("## Recent Commits")
    lines.append("")
    lines.append("| Commit | Author | Date | Message |")
    lines.append("|---|---|---|---|")
    for sha, author, date, message in commits:
        message = message.replace("|", "\\|")
        lines.append(f"| `{sha}` | {author} | {date} | {message} |")
    lines.append("")

    if contributors:
        lines.append("## Contributors")
        lines.append("")
        lines.append("| Name | Commits |")
        lines.append("|---|---|")
        for name, count in contributors:
            lines.append(f"| {name} | {count} |")
        lines.append("")

    return "\n".join(lines) + "\n"


def main():
    os.makedirs(DOCS_DIR, exist_ok=True)
    markdown = build_markdown()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(markdown)
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
