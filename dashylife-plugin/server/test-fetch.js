import assert from 'node:assert/strict';

// Stub the remote API in the child process so the protocol test needs no server or credentials.
globalThis.fetch = async (url, options) => {
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://dashylife.test');
  assert.ok(parsed.pathname.startsWith('/api/mcp/tools/'));
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['content-type'], 'application/json');
  assert.equal(options.headers.authorization, 'Bearer protocol-test-key');
  return Response.json({
    tool: decodeURIComponent(parsed.pathname.slice('/api/mcp/tools/'.length)),
    args: JSON.parse(options.body),
  });
};
