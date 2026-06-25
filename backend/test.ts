import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { AddressInfo } from 'net';
import { MongoMemoryServer } from 'mongodb-memory-server';

test('Capto Backend API Integration Tests with MongoDB', async (t) => {
  // Start in-memory MongoDB instance and set URI before app is imported
  const mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  // Dynamically import app and models so they use the new MONGODB_URI
  const app = (await import('./server')).default;
  const User = (await import('./models/User')).default;
  const Recording = (await import('./models/Recording')).default;

  let server: any;
  let port: number;
  let baseUrl: string;
  let token: string = '';

  // Setup: Start server on an ephemeral port before running tests
  await new Promise<void>((resolve) => {
    server = app.listen(0, async () => {
      const address = server.address() as AddressInfo;
      port = address.port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  // Ensure connection is established
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI as string);
  }

  // Teardown: Close the server and disconnect DB when tests finish
  t.after(async () => {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    server.close();
  });

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';

  await t.test('POST /api/auth/register - successfully registers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    assert.strictEqual(res.status, 201);
    const data: any = await res.json();
    assert.ok(data.token, 'Expected token to be present');
    assert.strictEqual(data.user.email, testEmail);
    token = data.token;
  });

  await t.test('POST /api/auth/login - successfully logs in', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.ok(data.token, 'Expected token to be present');
  });

  await t.test('GET /api/recordings - unauthorized without token', async () => {
    const res = await fetch(`${baseUrl}/api/recordings`);
    assert.strictEqual(res.status, 401);
    const data: any = await res.json();
    assert.strictEqual(data.error, 'Authentication token required');
  });

  await t.test('GET /api/recordings - authorized with token', async () => {
    const res = await fetch(`${baseUrl}/api/recordings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data), 'Expected recordings response to be an array');
  });

  await t.test('GET /api/recordings/:id with unknown ID returns 404', async () => {
    // Generate a valid ObjectId to test 404
    const fakeObjectId = new mongoose.Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/recordings/${fakeObjectId}`);
    assert.strictEqual(res.status, 404);
    const data: any = await res.json();
    assert.strictEqual(data.error, 'Recording not found');
  });

  await t.test('POST /api/upload without authentication fails with 401', async () => {
    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Test recording', duration: '12.5' }),
      headers: { 'Content-Type': 'application/json' }
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/upload with auth but without file attachment fails with 400', async () => {
    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Test recording', duration: '12.5' }),
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    assert.strictEqual(res.status, 400);
    const data: any = await res.json();
    assert.strictEqual(data.error, 'No video file uploaded');
  });

  await t.test('DELETE /api/recordings/:id with unknown ID returns 404', async () => {
    const fakeObjectId = new mongoose.Types.ObjectId().toHexString();
    const res = await fetch(`${baseUrl}/api/recordings/${fakeObjectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(res.status, 404);
    const data: any = await res.json();
    assert.strictEqual(data.error, 'Recording not found');
  });
});
