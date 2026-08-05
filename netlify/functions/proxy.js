// ═══════════════════════════════════════════════════════════════
// MinBizCon 2026 — Server-Side Proxy to Google Apps Script
// Runs on Netlify's server (not the browser) — no CORS restrictions
// apply here, because CORS is a browser-only security rule.
// ═══════════════════════════════════════════════════════════════

// PASTE YOUR GOOGLE APPS SCRIPT DEPLOYMENT URL BELOW
var GAS_URL = 'https://script.google.com/macros/s/AKfycbyvOCK3YufLCktjsPNkw3QAOkhZqSZ4h2vkkgvuJ-aAsovutfFNfqfNNlxUyJcMoS3Hsw/exec';

exports.handler = async function (event) {
  // Allow the browser to call this function from any page on this site
  var corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight (browsers sometimes send this first)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    var params = event.queryStringParameters || {};
    var qs = Object.keys(params)
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');

    var targetUrl = GAS_URL + (qs ? ('?' + qs) : '');

    // Server-to-server fetch — Google has no reason to block this,
    // there is no browser involved and therefore no CORS policy applies.
    // We add browser-like headers because Google's servers sometimes
    // redirect non-browser requests (missing User-Agent) to a sign-in
    // page as a bot-protection measure, even on public deployments.
    var response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    var text = await response.text();

    // Try to confirm it's valid JSON before passing along
    try {
      JSON.parse(text);
    } catch (parseErr) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          status: 'error',
          name: 'ProxyBadResponse',
          message: 'Google Apps Script returned non-JSON. Raw start: ' + text.substring(0, 150)
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: text
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        status: 'error',
        name: 'ProxyServerError',
        message: err.message || 'Unknown proxy error'
      })
    };
  }
};
