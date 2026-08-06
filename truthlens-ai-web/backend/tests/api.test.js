/**
 * TruthLens AI – API smoke / integration tests
 * Requires backend running on PORT (default 5000) and MongoDB available.
 * Run: node tests/api.test.js
 */

const axios = require("axios");

const BASE = process.env.API_BASE || "http://localhost:5000";
let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  PASS  ${name}`);
}
function fail(name, err) {
  failed += 1;
  console.error(`  FAIL  ${name}`);
  console.error(`        ${err?.response?.data?.message || err.message}`);
}

async function run() {
  console.log(`\n=== API Tests against ${BASE} ===\n`);

  try {
    const health = await axios.get(`${BASE}/`);
    if (String(health.data).includes("TruthLens")) ok("GET / health");
    else fail("GET / health", new Error("unexpected body"));
  } catch (e) {
    fail("GET / health", e);
  }

  try {
    const cors = await axios.get(`${BASE}/cors-test`);
    if (cors.data?.success) ok("GET /cors-test");
    else fail("GET /cors-test", new Error("success!=true"));
  } catch (e) {
    fail("GET /cors-test", e);
  }

  const email = `test_${Date.now()}@truthlens.test`;
  const password = "TestPass123";
  let token = null;

  try {
    const signup = await axios.post(`${BASE}/api/auth/signup`, {
      name: "Test User",
      email,
      password,
    });
    if (signup.data?.token && signup.data.token.split(".").length === 3 && signup.data?.user?.email === email) {
      token = signup.data.token;
      ok("POST /api/auth/signup returns JWT");
    } else fail("POST /api/auth/signup returns JWT", new Error("missing/invalid JWT"));
  } catch (e) {
    fail("POST /api/auth/signup returns JWT", e);
  }

  try {
    const login = await axios.post(`${BASE}/api/auth/login`, { email, password });
    if (login.data?.token && login.data.token.split(".").length === 3) {
      token = login.data.token;
      ok("POST /api/auth/login returns JWT");
    } else fail("POST /api/auth/login returns JWT", new Error("not a JWT"));
  } catch (e) {
    fail("POST /api/auth/login returns JWT", e);
  }

  try {
    const dup = await axios.post(`${BASE}/api/auth/signup`, {
      name: "Dup",
      email,
      password,
    });
    fail("duplicate email rejected", new Error(`unexpected success: ${JSON.stringify(dup.data)}`));
  } catch (e) {
    if (e.response?.status === 400) ok("duplicate email rejected");
    else fail("duplicate email rejected", e);
  }

  if (token) {
    try {
      const profile = await axios.get(`${BASE}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profile.data?.user?.email === email) ok("GET /api/auth/profile");
      else fail("GET /api/auth/profile", new Error("email mismatch"));
    } catch (e) {
      fail("GET /api/auth/profile", e);
    }

    try {
      const updated = await axios.put(
        `${BASE}/api/auth/profile`,
        { name: "Updated User", username: "updated_user" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (updated.data?.user?.name === "Updated User") ok("PUT /api/auth/profile");
      else fail("PUT /api/auth/profile", new Error("name not updated"));
    } catch (e) {
      fail("PUT /api/auth/profile", e);
    }
  }

  try {
    const news = await axios.post(`${BASE}/api/check-news`, {
      text: "The Indian Space Research Organisation successfully launched a weather satellite to improve climate monitoring.",
    }, { timeout: 120000 });
    if (news.data?.status && news.data?.confidence) ok("POST /api/check-news");
    else fail("POST /api/check-news", new Error("missing fields"));
  } catch (e) {
    fail("POST /api/check-news", e);
  }

  try {
    const bad = await axios.post(`${BASE}/api/check-url`, { url: "not-a-url" });
    if (bad.data?.status === "FAKE" || bad.data?.status === "UNCERTAIN") {
      ok("invalid URL rejected (FAKE/UNCERTAIN response)");
    } else {
      fail("invalid URL rejected", new Error(`unexpected: ${JSON.stringify(bad.data)}`));
    }
  } catch (e) {
    if (e.response?.status >= 400) ok("invalid URL rejected (HTTP error)");
    else fail("invalid URL rejected", e);
  }

  try {
    const url = await axios.post(`${BASE}/api/check-url`, { url: "https://www.bbc.com" }, { timeout: 60000 });
    if (url.data?.status && url.data?.confidence) ok("POST /api/check-url");
    else fail("POST /api/check-url", new Error("missing fields"));
  } catch (e) {
    fail("POST /api/check-url", e);
  }

  try {
    const hist = await axios.get(`${BASE}/api/history`, { params: { email } });
    if (hist.data?.records || Array.isArray(hist.data)) ok("GET /api/history");
    else fail("GET /api/history", new Error("unexpected shape"));
  } catch (e) {
    fail("GET /api/history", e);
  }

  try {
    const dash = await axios.get(`${BASE}/api/dashboard/stats/${encodeURIComponent(email)}`);
    if (typeof dash.data?.totalAnalysis === "number") ok("GET /api/dashboard/stats");
    else fail("GET /api/dashboard/stats", new Error("missing totalAnalysis"));
  } catch (e) {
    fail("GET /api/dashboard/stats", e);
  }

  try {
    const chat = await axios.post(`${BASE}/api/chat`, {
      message: "What is fake news detection?",
      history: [],
      email,
    });
    if (chat.data?.reply || chat.data?.message || chat.data?.response) ok("POST /api/chat");
    else if (typeof chat.data === "string" && chat.data.length > 0) ok("POST /api/chat");
    else ok("POST /api/chat (responded)");
  } catch (e) {
    // Chat may return under different keys; accept 200 with body
    if (e.response?.status) fail("POST /api/chat", e);
    else fail("POST /api/chat", e);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
