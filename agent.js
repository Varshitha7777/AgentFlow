// AgentFlow — browser-only multi-tool agent
// NOTE: For production, route LLM calls through a tiny backend/proxy (see bottom).

// ---------- Utilities ----------
const ui = {
  chat: document.getElementById('chat'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  autoLoop: document.getElementById('autoLoop'),
  provider: document.getElementById('provider'),
  llmKey: document.getElementById('llmKey'),
  googleKey: document.getElementById('googleKey'),
  googleCx: document.getElementById('googleCx'),
  saveKeys: document.getElementById('saveKeys'),
  clearKeys: document.getElementById('clearKeys'),
  jsSnippet: document.getElementById('jsSnippet'),
  jsOut: document.getElementById('jsOut'),
  runJsBtn: document.getElementById('runJsBtn'),
  searchQuery: document.getElementById('searchQuery'),
  searchBtn: document.getElementById('searchBtn'),
  searchResults: document.getElementById('searchResults'),
};

function addMessage(role, content, meta = {}) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  const who = document.createElement('div');
  who.className = 'role';
  who.textContent = role.toUpperCase() + (meta.tool ? ` • ${meta.tool}` : '');
  const body = document.createElement('div');

  if (typeof content === 'object') {
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(content, null, 2);
    body.appendChild(pre);
  } else {
    body.innerHTML = content
      .replace(/`{3}([\s\S]*?)`{3}/g, (_, code) => `<pre>${escapeHtml(code)}</pre>`)
      .replace(/\n/g, '<br/>');
  }

  el.appendChild(who);
  el.appendChild(body);
  ui.chat.appendChild(el);
  ui.chat.scrollTop = ui.chat.scrollHeight;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function saveKeys() {
  sessionStorage.setItem('provider', ui.provider.value);
  sessionStorage.setItem('llmKey', ui.llmKey.value);
  sessionStorage.setItem('googleKey', ui.googleKey.value);
  sessionStorage.setItem('googleCx', ui.googleCx.value);
  addMessage('agent', '🔐 Keys saved in session (cleared on tab close).');
}
function loadKeys() {
  ui.provider.value = sessionStorage.getItem('provider') || 'openai';
  ui.llmKey.value = sessionStorage.getItem('llmKey') || '';
  ui.googleKey.value = sessionStorage.getItem('googleKey') || '';
  ui.googleCx.value = sessionStorage.getItem('googleCx') || '';
}
function clearKeys() {
  sessionStorage.clear();
  ui.llmKey.value = ui.googleKey.value = ui.googleCx.value = '';
  addMessage('agent', '🧹 Keys cleared.');
}

// ---------- Demo helper functions available to JS tool ----------
const demoFunctions = {
  fibonacci(n) {
    const out = []; let a = 0, b = 1;
    for (let i=0; i<n; i++) { out.push(a); [a,b] = [b, a+b]; }
    return out;
  },
  isPrime(n) {
    if (n<2) return false;
    for (let i=2; i*i<=n; i++) if (n%i===0) return false;
    return true;
  },
  generateRandomData(n=10) { return Array.from({length:n}, () => Math.random()); }
};

// ---------- Tools ----------
async function tool_google_search({ query, num_results = 5 }) {
  const key = ui.googleKey.value.trim();
  const cx  = ui.googleCx.value.trim();
  if (!key || !cx) throw new Error('Google Search API key and CX required');

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.max(1, Math.min(10, num_results))));

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Google Search error: ${r.status}`);
  const data = await r.json();

  const items = (data.items || []).map(it => ({
    title: it.title, link: it.link, snippet: it.snippet
  }));
  addMessage('tool', items, { tool: 'google_search' });
  return { items };
}

// Simple “AI Pipe” simulated local workflows to avoid another backend
function tool_ai_pipe({ operation, text, target_lang = 'en' }) {
  const ops = {
    summarize(t) {
      const sents = t.split(/[.!?]\s+/).slice(0, 5).join('. ');
      return sents.length > 0 ? sents + '.' : t;
    },
    keywords(t) {
      const words = t.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/);
      const freq = new Map();
      for (const w of words) if (w.length>4) freq.set(w, (freq.get(w)||0)+1);
      return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
    },
    sentiment(t) {
      const pos = ['good','great','excellent','positive','benefit','success'];
      const neg = ['bad','poor','terrible','negative','risk','failure'];
      let score = 0;
      for (const p of pos) if (t.toLowerCase().includes(p)) score++;
      for (const n of neg) if (t.toLowerCase().includes(n)) score--;
      return { score, label: score>0?'positive':score<0?'negative':'neutral' };
    },
    translate(t, lang) {
      // Fake translate to keep it offline
      return `[${lang}] ${t}`;
    }
  };
  let result;
  if (operation === 'summarize') result = ops.summarize(text);
  else if (operation === 'keywords') result = ops.keywords(text);
  else if (operation === 'sentiment') result = ops.sentiment(text);
  else if (operation === 'translate') result = ops.translate(text, target_lang);
  else throw new Error(`Unknown ai_pipe operation: ${operation}`);
  addMessage('tool', result, { tool: `ai_pipe/${operation}` });
  return { result };
}

// Run JS safely-ish inside a sandboxed iframe (no top-level access)
async function tool_run_js({ code }) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('sandbox', 'allow-scripts');
  document.body.appendChild(iframe);

  const wrapped = `
    (function(){
      const demoFunctions = ${JSON.stringify(Object.keys(demoFunctions))}.reduce((acc, k) => {
        const fn = parent.demoFunctions[k].toString();
        acc[k] = eval('(' + fn + ')');
        return acc;
      }, {});
      try {
        const result = (function(){ ${code}; return typeof result !== 'undefined' ? result : undefined; })();
        parent.postMessage({ __AGENTFLOW_JS__: { ok: true, result } }, '*');
      } catch (e) {
        parent.postMessage({ __AGENTFLOW_JS__: { ok: false, error: String(e) } }, '*');
      }
    })();
  `;

  const p = new Promise((resolve) => {
    function onMsg(ev) {
      const data = ev.data && ev.data.__AGENTFLOW_JS__;
      if (!data) return;
      window.removeEventListener('message', onMsg);
      resolve(data);
    }
    window.addEventListener('message', onMsg);
  });

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(`<script>${wrapped}<\/script>`);
  iframe.contentWindow.document.close();

  const out = await p;
  document.body.removeChild(iframe);

  if (!out.ok) throw new Error(out.error);
  addMessage('tool', out.result, { tool: 'run_js' });
  return { result: out.result };
}

// ---------- LLM Clients ----------
async function callOpenAI(messages, tools) {
  const key = ui.llmKey.value.trim();
  if (!key) throw new Error('OpenAI API key required');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tool_choice: 'auto',
      tools: tools.map(t => ({
        type: 'function',
        function: t
      }))
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const msg = choice?.message || {};
  return msg;
}

// Stubs for other providers (left disabled in UI)
async function callAnthropic(messages, tools) {
  throw new Error('Anthropic not wired yet');
}
async function callGoogle(messages, tools) {
  throw new Error('Google not wired yet');
}

// ---------- Agent ----------
class Agent {
  constructor() {
    this.history = [];
    this.tools = [
      {
        name: 'google_search',
        description: 'Search Google for information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query' },
            num_results: { type: 'integer', minimum: 1, maximum: 10 }
          },
          required: ['query']
        }
      },
      {
        name: 'ai_pipe',
        description: 'Local text utilities: summarize, keywords, sentiment, translate',
        parameters: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['summarize','keywords','sentiment','translate'] },
            text: { type: 'string' },
            target_lang: { type: 'string' }
          },
          required: ['operation','text']
        }
      },
      {
        name: 'run_js',
        description: 'Execute JavaScript code in a sandboxed iframe and return the result',
        parameters: {
          type: 'object',
          properties: { code: { type: 'string' } },
          required: ['code']
        }
      }
    ];
  }

  addUser(text) {
    this.history.push({ role: 'user', content: text });
    addMessage('user', escapeHtml(text));
  }

  async callLLM() {
    const provider = ui.provider.value;
    const messages = this.history.slice(-20); // trim
    const tools = this.tools.map(t => ({
      name: t.name, description: t.description, parameters: t.parameters
    }));

    if (provider === 'openai') return await callOpenAI(messages, tools);
    if (provider === 'anthropic') return await callAnthropic(messages, tools);
    if (provider === 'google') return await callGoogle(messages, tools);
  }

  async handleToolCall(tc) {
    const { function: fn } = tc;
    const name = fn.name;
    const args = JSON.parse(fn.arguments || '{}');

    if (name === 'google_search') return await tool_google_search(args);
    if (name === 'ai_pipe')       return await tool_ai_pipe(args);
    if (name === 'run_js')        return await tool_run_js(args);
    throw new Error(`Unknown tool: ${name}`);
  }

  async loop(auto = true) {
    while (true) {
      const msg = await this.callLLM();

      // assistant "content"
      if (msg.content) {
        addMessage('agent', escapeHtml(msg.content));
        this.history.push({ role: 'assistant', content: msg.content });
      }

      // tool calls
      const calls = msg.tool_calls || [];
      if (calls.length > 0) {
        for (const tc of calls) {
          try {
            const toolResult = await this.handleToolCall(tc);
            const toolMsg = {
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(toolResult)
            };
            this.history.push(toolMsg);
          } catch (e) {
            addMessage('agent', `❌ Tool error: ${escapeHtml(String(e))}`);
            this.history.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ error: String(e) })
            });
          }
        }
        if (auto) continue; // keep the loop going
      }
      break;
    }
  }
}

// ---------- Wire up UI ----------
const agent = new Agent();
loadKeys();

ui.saveKeys.addEventListener('click', saveKeys);
ui.clearKeys.addEventListener('click', clearKeys);

ui.sendBtn.addEventListener('click', async () => {
  const text = ui.userInput.value.trim();
  if (!text) return;
  ui.userInput.value = '';
  agent.addUser(text);

  ui.sendBtn.disabled = true;
  try { await agent.loop(ui.autoLoop.checked); }
  catch (e) { addMessage('agent', `❌ ${escapeHtml(String(e))}`); }
  finally { ui.sendBtn.disabled = false; }
});

ui.runJsBtn.addEventListener('click', async () => {
  const code = ui.jsSnippet.value;
  try {
    const { result } = await tool_run_js({ code });
    ui.jsOut.textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    ui.jsOut.textContent = 'Error: ' + String(e);
  }
});

ui.searchBtn.addEventListener('click', async () => {
  const q = ui.searchQuery.value.trim();
  if (!q) return;
  ui.searchResults.textContent = 'Searching...';
  try {
    const { items } = await tool_google_search({ query: q, num_results: 5 });
    ui.searchResults.innerHTML = items.map(it =>
      `<div class="result-item"><a href="${it.link}" target="_blank" rel="noreferrer">${escapeHtml(it.title)}</a><div>${escapeHtml(it.snippet||'')}</div></div>`
    ).join('');
  } catch (e) {
    ui.searchResults.textContent = String(e);
  }
});

// Initial hello
addMessage('agent', 'Hi! Paste your API keys (or use the proxy below), type a task, and hit Run. Try: <code>Interview me and draft a short bio about my IBM experience.</code>');
window.demoFunctions = demoFunctions;
