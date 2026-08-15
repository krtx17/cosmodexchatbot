// ════════════════════════════════════════════════
//  COSMODEX — chatbot.js
//  Handles all chatbot logic:
//  - Toggle open/close
//  - Sending messages to Claude API
//  - Rendering chat bubbles
//  - Typing animation
//  - Star canvas animation
// ════════════════════════════════════════════════


// ══════════════════════════════
//  STAR FIELD ANIMATION
// ══════════════════════════════
(function () {
  const canvas = document.getElementById('star-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 220; i++) {
      stars.push({
        x:     Math.random() * W,
        y:     Math.random() * H,
        r:     Math.random() * 1.4 + 0.2,
        a:     Math.random(),
        speed: Math.random() * 0.004 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;
    stars.forEach(s => {
      // twinkle effect
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha * s.a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); initStars(); });
  resize();
  initStars();
  draw();
})();


// ══════════════════════════════
//  CHATBOT STATE
// ══════════════════════════════

// Stores the full conversation history for multi-turn chat
const conversationHistory = [];

// Tracks if the bot is currently typing (prevents double sends)
let isBotTyping = false;

// Whether the greeting has been shown yet
let greetingShown = false;


// ══════════════════════════════
//  DOM ELEMENTS
// ══════════════════════════════
const chatToggleBtn  = document.getElementById('chat-toggle');
const chatWindow     = document.getElementById('chat-window');
const chatCloseBtn   = document.getElementById('chat-close');
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const sendButton     = document.getElementById('send-btn');
const quickChips     = document.getElementById('quick-chips');
const notifBadge     = document.querySelector('.chat-badge');


// ══════════════════════════════
//  TOGGLE OPEN / CLOSE
// ══════════════════════════════
chatToggleBtn.addEventListener('click', () => {
  chatWindow.classList.add('open');

  // Hide the notification badge
  if (notifBadge) notifBadge.style.display = 'none';

  // Show greeting only on first open
  if (!greetingShown) {
    greetingShown = true;
    showBotGreeting();
  }
});

chatCloseBtn.addEventListener('click', () => {
  chatWindow.classList.remove('open');
});


// ══════════════════════════════
//  BOT GREETING (first open)
// ══════════════════════════════
function showBotGreeting() {
  const greeting =
    `🚀 Hello Explorer! I'm **CosmBot** — your AI navigator on Cosmodex!\n\n` +
    `Here's what I can do for you:\n` +
    `📚 Suggest courses for any tech stack\n` +
    `🛸 Suggest project ideas to build\n` +
    `🗺️ Guide you on how to use Cosmodex\n` +
    `💪 Motivate you when you're stuck\n` +
    `💬 Answer general questions\n\n` +
    `What galaxy shall we explore today? ✨`;

  appendMessage('bot', greeting);
  conversationHistory.push({ role: 'assistant', content: greeting });
}


// ══════════════════════════════
//  QUICK CHIP BUTTONS
// ══════════════════════════════

// Called when user clicks a quick-chip button
function sendChip(element) {
  // Get text and remove leading emoji/special chars
  const raw  = element.textContent.trim();
  const text = raw.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\s]+/u, '').trim();

  chatInput.value = text;

  // Hide chips after first use
  if (quickChips) quickChips.style.display = 'none';

  handleSend();
}


// ══════════════════════════════
//  SEND MESSAGE
// ══════════════════════════════

// Click send button
sendButton.addEventListener('click', handleSend);

// Press Enter key
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

async function handleSend() {
  const userText = chatInput.value.trim();

  // Do nothing if empty or bot is still typing
  if (!userText || isBotTyping) return;

  // 1. Show user's message in chat
  appendMessage('user', userText);

  // 2. Add to conversation history
  conversationHistory.push({ role: 'user', content: userText });

  // 3. Clear input and disable send button
  chatInput.value = '';
  sendButton.disabled = true;
  isBotTyping = true;

  // 4. Show typing animation
  const typingEl = showTypingIndicator();

  // 5. Call Claude API
  try {
   // Build messages array with system prompt at top
const messagesWithSystem = [
  { role: "system", content: COSMODEX_SYSTEM_PROMPT },
  ...conversationHistory
];

const response = await fetch("https://cosmodex-chatbot.onrender.com/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: userText }),
});

const data = await response.json();
const botReply = data.reply || "Connection error, please try again.";
    // 6. Remove typing indicator and show reply
    typingEl.remove();
    appendMessage('bot', botReply);

    // 7. Save bot reply to history
    conversationHistory.push({ role: 'assistant', content: botReply });

  } catch (error) {
    console.error('CosmBot Error:', error);
    typingEl.remove();

    // Show error message depending on type
    if (error.message.includes('API key')) {
      appendMessage('bot',
        '⚠️ API key not set! Open **config.js** and paste your Anthropic API key. ' +
        'Get one free at console.anthropic.com 🔑'
      );
    } else {
      appendMessage('bot',
        '⚠️ Transmission error from the cosmos! ' +
        'Please check your internet connection and try again. 🛸'
      );
    }
  }

  // 8. Re-enable input
  isBotTyping       = false;
  sendButton.disabled = false;
  chatInput.focus();
}


// ══════════════════════════════
//  RENDER CHAT BUBBLE
// ══════════════════════════════
function appendMessage(role, text) {
  // Wrapper
  const msgWrap = document.createElement('div');
  msgWrap.className = `msg ${role}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'bot' ? '🤖' : '👤';

  // Bubble
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  // Convert simple markdown to HTML
  bubble.innerHTML = formatMessage(text);

  msgWrap.appendChild(avatar);
  msgWrap.appendChild(bubble);
  chatMessages.appendChild(msgWrap);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ══════════════════════════════
//  FORMAT MESSAGE TEXT
//  Converts basic markdown → HTML
// ══════════════════════════════
function formatMessage(text) {
  return text
    // Bold: **text** → <strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Bullet points: lines starting with •
    .replace(/^•\s(.+)/gm, '<span style="display:block;padding-left:8px">• $1</span>')
    // Arrow lines: lines starting with →
    .replace(/^→\s(.+)/gm, '<span style="display:block;padding-left:8px;color:#00e5ff">→ $1</span>')
    // Line breaks
    .replace(/\n/g, '<br>');
}


// ══════════════════════════════
//  TYPING INDICATOR (... dots)
// ══════════════════════════════
function showTypingIndicator() {
  const msgWrap = document.createElement('div');
  msgWrap.className = 'msg bot';
  msgWrap.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble" style="padding: 4px 8px;">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(msgWrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgWrap;
}