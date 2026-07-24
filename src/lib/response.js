export function htmlResponse(html, init = {}) {
  return new Response(html, {
    ...init,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      ...(init.headers || {})
    }
  });
}

// Markdown for Agents: when a request's Accept header prefers text/markdown
// over text/html, agents get a lightweight Markdown rendering of the same
// page instead of the full HTML (navbar/scripts/styles stripped). HTML stays
// the default for everyone else — browsers never send Accept: text/markdown.
function withMergedVary(headers = {}, addition) {
  const existing = headers.vary || headers.Vary;
  const merged = existing ? `${addition}, ${existing}` : addition;
  return { ...headers, vary: merged };
}

export async function htmlOrMarkdownResponse(html, request, init = {}) {
  const { wantsMarkdown, htmlToMarkdown } = await import("./markdown.js");

  if (request && wantsMarkdown(request)) {
    const markdown = htmlToMarkdown(html, { url: request.url });
    return new Response(markdown, {
      ...init,
      headers: {
        "content-type": "text/markdown; charset=UTF-8",
        ...withMergedVary(init.headers, "Accept")
      }
    });
  }

  return htmlResponse(html, {
    ...init,
    headers: withMergedVary(init.headers, "Accept")
  });
}

export function xmlResponse(xml, init = {}) {
  return new Response(xml, {
    ...init,
    headers: {
      "content-type": "application/xml; charset=UTF-8",
      ...(init.headers || {})
    }
  });
}

export function textResponse(text, init = {}) {
  return new Response(text, {
    ...init,
    headers: {
      "content-type": "text/plain; charset=UTF-8",
      ...(init.headers || {})
    }
  });
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      ...(init.headers || {})
    }
  });
}

export function methodNotAllowedResponse(allowedMethods) {
  return jsonResponse(
    {
      ok: false,
      error: "Method not allowed",
      allowedMethods
    },
    {
      status: 405,
      headers: {
        allow: allowedMethods.join(", ")
      }
    }
  );
}

export function notFoundResponse(details = {}) {
  return jsonResponse(
    {
      ok: false,
      error: "Not found",
      ...details
    },
    {
      status: 404
    }
  );
}

