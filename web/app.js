(() => {
  const launcher = document.querySelector('#agent-launcher');
  const panel = document.querySelector('#chat-panel');
  const backdrop = document.querySelector('#chat-backdrop');
  const closeButton = document.querySelector('#close-chat');
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#chat-input');
  const messages = document.querySelector('#chat-messages');
  const suggestions = document.querySelector('#suggestions');
  const tourCard = document.querySelector('#tour-card');
  const tourClose = document.querySelector('#tour-close');
  const tourChat = document.querySelector('#tour-chat');
  const history = [];
  const sessionKey = 'ridhi-agent-session';
  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = window.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(sessionKey, sessionId);
  }

  function openChat() {
    tourCard.classList.remove('shown');
    panel.classList.add('open');
    backdrop.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => input.focus(), 150);
  }
  function closeChat() {
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.focus();
  }
  function appendInlineMarkdown(parent, text) {
    const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
    let cursor = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index;
      if (index > cursor) parent.append(document.createTextNode(text.slice(cursor, index)));
      if (match[1]) {
        const strong = document.createElement('strong');
        strong.textContent = match[1];
        parent.append(strong);
      } else if (match[2]) {
        const emphasis = document.createElement('em');
        emphasis.textContent = match[2];
        parent.append(emphasis);
      } else {
        const label = match[3] || match[5];
        let href = match[4] || match[5];
        let punctuation = '';
        if (!match[3]) {
          const trailing = href.match(/[.,!?;:)]+$/)?.[0] || '';
          href = href.slice(0, href.length - trailing.length);
          punctuation = trailing;
        }
        try {
          const safeUrl = new URL(href);
          if (safeUrl.protocol === 'http:' || safeUrl.protocol === 'https:') {
            const anchor = document.createElement('a');
            anchor.href = safeUrl.href;
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.textContent = label;
            parent.append(anchor, document.createTextNode(punctuation));
          } else {
            parent.append(document.createTextNode(match[0]));
          }
        } catch {
          parent.append(document.createTextNode(match[0]));
        }
      }
      cursor = index + match[0].length;
    }
    if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
  }
  function renderFormattedAnswer(container, text) {
    container.replaceChildren();
    let paragraph = [];
    let list = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      const block = document.createElement('p');
      appendInlineMarkdown(block, paragraph.join(' '));
      container.append(block);
      paragraph = [];
    };
    const flushList = () => {
      if (!list) return;
      container.append(list);
      list = null;
    };

    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }
      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const block = document.createElement('h4');
        appendInlineMarkdown(block, heading[1]);
        container.append(block);
        continue;
      }
      const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
      const numbered = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (bullet || numbered) {
        flushParagraph();
        const type = numbered ? 'ol' : 'ul';
        if (!list || list.tagName.toLowerCase() !== type) {
          flushList();
          list = document.createElement(type);
        }
        const item = document.createElement('li');
        appendInlineMarkdown(item, (bullet || numbered)[1]);
        list.append(item);
        continue;
      }
      flushList();
      paragraph.push(trimmed);
    }
    flushParagraph();
    flushList();
  }
  function addMessage(role, content, extraClass = '') {
    const row = document.createElement('div');
    row.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'} ${extraClass}`;
    if (role !== 'user') {
      const avatar = document.createElement('span');
      avatar.className = 'message-avatar';
      avatar.textContent = 'RS';
      row.append(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = content;
    row.append(bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  launcher.addEventListener('click', openChat);
  tourChat.addEventListener('click', openChat);
  tourClose.addEventListener('click', () => tourCard.classList.remove('shown'));
  tourCard.addEventListener('click', (event) => {
    const bubble = event.target.closest('[data-target]');
    if (!bubble) return;
    document.getElementById(bubble.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
    tourCard.classList.remove('shown');
  });
  closeButton.addEventListener('click', closeChat);
  backdrop.addEventListener('click', closeChat);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('open')) closeChat();
  });
  window.setTimeout(() => tourCard.classList.add('shown'), 900);
  suggestions.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    input.value = button.textContent;
    suggestions.remove();
    form.requestSubmit();
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 100)}px`;
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    if (suggestions.isConnected) suggestions.remove();
    addMessage('user', message);
    history.push({ role: 'user', content: message });
    input.value = '';
    input.style.height = 'auto';
    const send = form.querySelector('button');
    send.disabled = true;
    const pending = addMessage('assistant', 'Thinking…', 'typing');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: history.slice(0, -1).slice(-8), session_id: sessionId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || 'The agent is unavailable. Please try again.');
      renderFormattedAnswer(pending.querySelector('.message-bubble'), payload.answer);
      pending.classList.remove('typing');
      history.push({ role: 'assistant', content: payload.answer });
    } catch (error) {
      pending.querySelector('.message-bubble').textContent = error.message || 'I could not reach the agent. Please try again.';
      pending.classList.remove('typing');
      history.pop();
    } finally {
      send.disabled = false;
      input.focus();
      messages.scrollTop = messages.scrollHeight;
    }
  });
})();
