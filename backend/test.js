const test = require('node:test');
const assert = require('node:assert');
const app = require('./server');

test('Capto Backend API Integration Tests', async (t) => {
  let server;
  let port;
  let baseUrl;

  // Setup: Start server on an ephemeral port before running tests
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  // Teardown: Close the server when tests finish
  t.after(() => {
    server.close();
  });

  await t.test('GET /api/recordings returns successfully', async () => {
    const res = await fetch(`${baseUrl}/api/recordings`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected recordings response to be an array');
  });

  await t.test('GET /api/recordings/:id with unknown ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/recordings/unknown-id-12345`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.error, 'Recording not found');
  });

  await t.test('POST /api/upload without file attachment fails with 400', async () => {
    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Test recording', duration: '12.5' }),
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.error, 'No video file uploaded');
  });

  await t.test('DELETE /api/recordings/:id with unknown ID returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/recordings/unknown-id-12345`, {
      method: 'DELETE'
    });
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.error, 'Recording not found');
  });
});
