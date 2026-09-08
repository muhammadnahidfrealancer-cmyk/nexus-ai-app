(function () {
  'use strict';

  // ১. স্টেট ম্যানেজমেন্ট
  const state = {
    user: JSON.parse(localStorage.getItem('nexus_user') || 'null'), // { name, provider, tier }
    apiUrl: localStorage.getItem('nexus_api_url') || '',
    apiToken: localStorage.getItem('nexus_api_token') || '',
    cloudFallback: localStorage.getItem('nexus_cloud_fallback') || 'deepseek-r1',
    thinking: localStorage.getItem('nexus_thinking') !== 'false',
    chats: JSON.parse(localStorage.getItem('nexus_chats') || '[]'),
    activeChatId: null,
    secretTapCount: 0,
    vaultUnlocked: false,
    attachedFiles: []
  };

  // ২. DOM এলিমেন্টস
  const el = {
    // Header & Nav
    btnOpenSidebar: document.getElementById('btnOpenSidebar'),
    btnCloseSidebar: document.getElementById('btnCloseSidebar'),
    sidebar: document.getElementById('sidebarDrawer'),
    overlay: document.getElementById('drawerOverlay'),
    btnNewChat: document.getElementById('btnNewChat'),
    chatHistoryList: document.getElementById('chatHistoryList'),
    btnUserProfile: document.getElementById('btnUserProfile'),
    userAvatar: document.getElementById('userAvatar'),
    userTierTag: document.getElementById('userTierTag'),
    btnOpenSubscription: document.getElementById('btnOpenSubscription'),
    
    // Chat
    chatViewport: document.getElementById('chatViewport'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    promptInput: document.getElementById('promptInput'),
    btnSend: document.getElementById('btnSend'),
    fileInput: document.getElementById('fileInput'),
    attachedFilesBar: document.getElementById('attachedFilesBar'),
    btnVoiceMic: document.getElementById('btnVoiceMic'),
    thinkingIndicator: document.getElementById('thinkingIndicator'),

    // Modals
    authModal: document.getElementById('authModal'),
    btnCloseAuth: document.getElementById('btnCloseAuth'),
    subModal: document.getElementById('subscriptionModal'),
    btnCloseSub: document.getElementById('btnCloseSubscription'),
    btnUpgradePro: document.getElementById('btnUpgradePro'),
    settingsModal: document.getElementById('settingsModal'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    
    // Secret Vault
    secretHeader: document.getElementById('secretTapHeader'),
    secretVault: document.getElementById('secretApiVault'),
    btnLockVaultNow: document.getElementById('btnLockVaultNow'),
    apiEndpointUrl: document.getElementById('apiEndpointUrl'),
    apiSecretToken: document.getElementById('apiSecretToken'),
    cloudFallbackSelect: document.getElementById('cloudFallbackSelect'),
    toggleThinking: document.getElementById('toggleThinking')
  };

  // ৩. ইউজার প্রোফাইল ও অথেন্টিকেশন লজিক
  function updateAuthUI() {
    if (state.user) {
      el.userAvatar.textContent = state.user.name[0].toUpperCase();
      el.userTierTag.textContent = state.user.tier.toUpperCase();
      el.userTierTag.className = `user-tier-tag ${state.user.tier === 'pro' ? 'pro' : ''}`;
    } else {
      el.userAvatar.textContent = '👤';
      el.userTierTag.textContent = 'FREE';
      el.userTierTag.className = 'user-tier-tag';
    }
  }

  // OAuth বাটন ক্লিক হ্যান্ডলার
  document.querySelectorAll('.oauth-btn').forEach(btn => {
    btn.onclick = () => {
      const provider = btn.getAttribute('data-provider');
      state.user = {
        name: `${provider} User`,
        provider: provider,
        tier: state.user?.tier || 'free'
      };
      localStorage.setItem('nexus_user', JSON.stringify(state.user));
      updateAuthUI();
      el.authModal.classList.remove('open');
      alert(`✅ Successfully signed in with ${provider}!`);
    };
  });

  // সাবস্ক্রিপশন প্রো আপগ্রেড
  el.btnUpgradePro.onclick = () => {
    if (!state.user) {
      el.subModal.classList.remove('open');
      el.authModal.classList.add('open');
      return;
    }
    state.user.tier = 'pro';
    localStorage.setItem('nexus_user', JSON.stringify(state.user));
    updateAuthUI();
    el.subModal.classList.remove('open');
    alert('🎉 Congratulations! You have unlocked Nexus Unlimited PRO!');
  };

  // ৪. সিক্রেট ভল্ট আনলক ও লক সিস্টেম
  el.secretHeader.onclick = () => {
    state.secretTapCount++;
    if (state.secretTapCount >= 5) {
      state.secretTapCount = 0;
      if (!state.vaultUnlocked) {
        const pass = prompt('Enter Master Developer Password:');
        if (pass === '1234') {
          state.vaultUnlocked = true;
          el.secretVault.classList.remove('locked');
          el.secretVault.classList.add('unlocked');
        } else if (pass !== null) {
          alert('❌ Incorrect Security Code.');
        }
      }
    }
  };

  function lockVault() {
    state.vaultUnlocked = false;
    el.secretVault.classList.remove('unlocked');
    el.secretVault.classList.add('locked');
  }

  el.btnLockVaultNow.onclick = () => {
    lockVault();
    alert('🔒 Developer Vault is now locked.');
  };

  // ৫. ফাইল এটাচমেন্ট হ্যান্ডলার (Zip, Images, Videos, Docs)
  el.fileInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      state.attachedFiles.push(file.name);
      const chip = document.createElement('span');
      chip.className = 'file-chip';
      chip.textContent = `📁 ${file.name}`;
      el.attachedFilesBar.appendChild(chip);
    });
    if (state.attachedFiles.length > 0) {
      el.attachedFilesBar.style.display = 'flex';
    }
  };

  // ৬. ভয়েস মাইক্রোফোন (Web Speech API)
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechAPI();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => el.btnVoiceMic.classList.add('listening');
    recognition.onend = () => el.btnVoiceMic.classList.remove('listening');
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      el.promptInput.value += (el.promptInput.value ? ' ' : '') + transcript;
      autoResizeTextarea();
    };
  }

  el.btnVoiceMic.onclick = () => {
    if (recognition) {
      try { recognition.start(); } catch (e) { recognition.stop(); }
    } else {
      alert('Speech-to-Text is not supported on this browser.');
    }
  };

  // টেক্সট এরিয়া অটো রিসাইজ (Claude Style)
  function autoResizeTextarea() {
    el.promptInput.style.height = 'auto';
    el.promptInput.style.height = Math.min(el.promptInput.scrollHeight, 160) + 'px';
  }
  el.promptInput.addEventListener('input', autoResizeTextarea);

  // ৭. চ্যাট ও স্ট্রিমিং লজিক
  function appendBubble(role, text, think = '') {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    let html = '';
    if (think) {
      html += `<details class="think-block"><summary>🧠 Thought Process</summary>${think}</details>`;
    }
    const formatted = text.replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    html += `<div class="bubble">${formatted}</div>`;
    row.innerHTML = html;
    el.messagesContainer.appendChild(row);
    el.chatViewport.scrollTop = el.chatViewport.scrollHeight;
    return row;
  }

  async function handleSend() {
    const text = el.promptInput.value.trim();
    if (!text && state.attachedFiles.length === 0) return;

    if (!state.activeChatId) createNewChat();
    const currentChat = state.chats.find(c => c.id === state.activeChatId);

    let promptMessage = text;
    if (state.attachedFiles.length > 0) {
      promptMessage = `[Attached Files: ${state.attachedFiles.join(', ')}]\n` + promptMessage;
      state.attachedFiles = [];
      el.attachedFilesBar.innerHTML = '';
      el.attachedFilesBar.style.display = 'none';
    }

    if (currentChat.messages.length === 0) {
      currentChat.title = text.slice(0, 26) || 'File Project';
      renderHistory();
    }

    currentChat.messages.push({ role: 'user', content: promptMessage });
    appendBubble('user', promptMessage);
    el.welcomeScreen.style.display = 'none';
    el.promptInput.value = '';
    el.promptInput.style.height = 'auto';

    const aiRow = appendBubble('ai', 'Thinking...');
    const bubbleEl = aiRow.querySelector('.bubble');

    if (state.apiUrl) {
      try {
        const response = await fetch(`${state.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.apiToken ? { 'Authorization': `Bearer ${state.apiToken}` } : {})
          },
          body: JSON.stringify({
            prompt: promptMessage,
            model: 'qwen-2.5-coder-32b',
            thinking: state.thinking,
            cloud_fallback: state.cloudFallback
          })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';
        bubbleEl.innerHTML = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullReply += decoder.decode(value, { stream: true });
          bubbleEl.innerHTML = fullReply.replace(/```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
          el.chatViewport.scrollTop = el.chatViewport.scrollHeight;
        }

        currentChat.messages.push({ role: 'ai', content: fullReply });
        saveChats();
      } catch (err) {
        bubbleEl.innerHTML = `<span style="color:#f85149;">Connection Error: ${err.message}. Verify Kaggle tunnel in Settings.</span>`;
      }
    } else {
      setTimeout(() => {
        const demoReply = `Connected to **Qwen 2.5 Coder 32B**. To run live inference from your Kaggle notebook, open Settings, tap title 5 times (pass: 1234), and paste your Ngrok tunnel URL.`;
        bubbleEl.innerHTML = demoReply;
        currentChat.messages.push({ role: 'ai', content: demoReply });
        saveChats();
      }, 400);
    }
  }

  // ৮. হিস্ট্রি ম্যানেজমেন্ট
  function renderHistory() {
    el.chatHistoryList.innerHTML = '';
    state.chats.forEach(chat => {
      const item = document.createElement('div');
      item.className = `history-item ${chat.id === state.activeChatId ? 'active' : ''}`;
      item.textContent = chat.title || 'Conversation';
      item.onclick = () => loadChat(chat.id);
      el.chatHistoryList.appendChild(item);
    });
  }

  function createNewChat() {
    state.activeChatId = Date.now().toString();
    state.chats.unshift({ id: state.activeChatId, title: 'New Conversation', messages: [] });
    saveChats();
    renderHistory();
    renderMessages();
    toggleSidebar(false);
  }

  function loadChat(id) {
    state.activeChatId = id;
    renderHistory();
    renderMessages();
    toggleSidebar(false);
  }

  function renderMessages() {
    const chat = state.chats.find(c => c.id === state.activeChatId);
    el.messagesContainer.innerHTML = '';
    if (!chat || chat.messages.length === 0) {
      el.welcomeScreen.style.display = 'block';
      return;
    }
    el.welcomeScreen.style.display = 'none';
    chat.messages.forEach(m => appendBubble(m.role, m.content, m.think));
    el.chatViewport.scrollTop = el.chatViewport.scrollHeight;
  }

  function saveChats() {
    localStorage.setItem('nexus_chats', JSON.stringify(state.chats));
  }

  function toggleSidebar(open) {
    el.sidebar.classList.toggle('open', open);
    el.overlay.classList.toggle('open', open);
  }

  // ৯. ইভেন্টস ও মোডাল কানেকশন
  el.btnOpenSidebar.onclick = () => toggleSidebar(true);
  el.btnCloseSidebar.onclick = () => toggleSidebar(false);
  el.overlay.onclick = () => toggleSidebar(false);
  el.btnNewChat.onclick = createNewChat;

  el.btnUserProfile.onclick = () => el.authModal.classList.add('open');
  el.btnCloseAuth.onclick = () => el.authModal.classList.remove('open');

  el.btnOpenSubscription.onclick = () => {
    toggleSidebar(false);
    el.subModal.classList.add('open');
  };
  el.btnCloseSub.onclick = () => el.subModal.classList.remove('open');

  el.btnOpenSettings.onclick = () => {
    el.apiEndpointUrl.value = state.apiUrl;
    el.apiSecretToken.value = state.apiToken;
    el.cloudFallbackSelect.value = state.cloudFallback;
    el.toggleThinking.checked = state.thinking;
    el.settingsModal.classList.add('open');
  };
  el.btnCloseSettings.onclick = () => {
    lockVault(); // বন্ধ করলেই অটোমেটিক লক হবে
    el.settingsModal.classList.remove('open');
  };

  el.btnSaveSettings.onclick = () => {
    state.apiUrl = el.apiEndpointUrl.value.trim();
    state.apiToken = el.apiSecretToken.value.trim();
    state.cloudFallback = el.cloudFallbackSelect.value;
    state.thinking = el.toggleThinking.checked;

    localStorage.setItem('nexus_api_url', state.apiUrl);
    localStorage.setItem('nexus_api_token', state.apiToken);
    localStorage.setItem('nexus_cloud_fallback', state.cloudFallback);
    localStorage.setItem('nexus_thinking', state.thinking);

    el.thinkingIndicator.style.display = state.thinking ? 'inline-block' : 'none';
    lockVault();
    el.settingsModal.classList.remove('open');
  };

  el.btnSend.onclick = handleSend;
  el.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // ইনিশিয়ালাইজেশন
  updateAuthUI();
  if (state.chats.length > 0) loadChat(state.chats[0].id);
  else createNewChat();

})();