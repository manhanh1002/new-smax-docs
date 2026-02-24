# Markdown API for AI Agents

This documentation template includes an API endpoint that serves documentation as plain markdown when requested with the `Accept: text/markdown` header. This is optimized for AI agents and CLI tools that prefer consuming markdown directly.

## Usage

### Fetch a single page as markdown

```bash
curl -H 'Accept: text/markdown' https://your-docs.com/api/docs/quickstart
```

### Fetch the documentation index

```bash
curl -H 'Accept: text/markdown' https://your-docs.com/api/docs
```

### Get JSON response (default)

```bash
curl https://your-docs.com/api/docs/quickstart
```

## Response Format

### Markdown Response

When `Accept: text/markdown` is present, the API returns:

```markdown
---
title: Page Title
description: Page description
slug: page-slug
---

# Page Title

Page description

[Content here...]
```

### JSON Response

Without the markdown header, you get:

```json
{
  "slug": "quickstart",
  "title": "Quickstart",
  "description": "Get your documentation site up and running in under 5 minutes.",
  "content": "## Step 1: Install the CLI..."
}
```

## Benefits for AI Agents

1. **Token Efficiency**: Markdown is significantly smaller than HTML, reducing token usage
2. **Clean Content**: No HTML tags, scripts, or styling to parse
3. **Structured Data**: Frontmatter provides metadata in a standard format
4. **Cacheable**: Responses include cache headers for efficient repeated requests

## Integration with Claude Code

Claude Code and similar AI agents can now fetch your documentation directly:

```bash
# Claude Code automatically uses text/markdown
curl -H 'Accept: text/markdown' https://your-docs.com/api/docs
```

This saves bandwidth and tokens while providing the AI with clean, parseable content.
