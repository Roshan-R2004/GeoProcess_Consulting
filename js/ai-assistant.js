(() => {
  const cfg = window.GEOPROCESS_AI || {};
  const WORKER_URL = String(cfg.workerUrl || '').trim();
  const CONTACT_URL = cfg.contactUrl || 'contact.html#project-enquiry';
  const BOOKING_URL = cfg.bookingUrl || 'booking.html';
  const EMAIL = cfg.contactEmail || 'contact@geoprocessconsulting.in';
  const WHATSAPP = cfg.whatsappUrl || 'https://wa.me/917205666324';

  const SERVICES = [
    'LiDAR Processing & Classification',
    'Powerline LiDAR & Vegetation Analysis',
    'GIS & Spatial Mapping',
    'Photogrammetry & Orthophoto',
    'BIM / Scan-to-BIM'
  ];

  const state = {
    open: false,
    turns: 0,
    messages: [],
    leadPrompted: false,
    listening: false,
    recognition: null
  };

  const escapeHtml = (value) => String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const localAnswer = (message) => {
    const q = message.toLowerCase();
    if (/hello|hi|hey|namaste/.test(q)) return 'Hello 👋 Welcome to GeoProcess Consulting. How can I help you with your geospatial project?';
    if (/lidar|point cloud|classification/.test(q)) return 'Yes. We provide LiDAR point-cloud processing and classification, including DTM/DSM, powerline workflows, vegetation analysis, feature extraction and QA/QC.';
    if (/powerline|power line|transmission|conductor|vegetation clearance/.test(q)) return 'Yes. We work on powerline LiDAR classification and mapping, vegetation analysis, corridor processing, feature extraction and related QA/QC.';
    if (/gis|mapping|digit/.test(q)) return 'We provide GIS and spatial-data services including digitization, mapping, conversion, utility/telecom workflows and spatial database preparation.';
    if (/bim|scan.?to.?bim|revit|3d model/.test(q)) return 'We provide BIM and Scan-to-BIM services, including 3D/CAD workflows, architectural modelling and MEP modelling.';
    if (/photo|ortho|uav/.test(q)) return 'We support photogrammetry and orthophoto workflows, including UAV image processing, aero-triangulation, DTM editing, planimetry and mosaicing.';
    if (/price|pricing|cost|quote|quotation|proposal/.test(q)) return 'Pricing depends on the dataset, scope, specification and timeline. I can collect the basic project details and then you can send the enquiry to our team for a project-specific quote.';
    if (/book|meeting|consult/.test(q)) return 'Absolutely. You can book a consultation with the team here.';
    if (/email|contact|whatsapp/.test(q)) return `You can send a project enquiry from the Contact page, email ${EMAIL}, or reach the team on WhatsApp.`;
    return 'I can help with LiDAR, GIS, powerline mapping, photogrammetry, BIM/Scan-to-BIM and related geospatial processing questions. Tell me what kind of project you have.';
  };

  const buildLeadSummary = () => {
    const userMessages = state.messages.filter(m => m.role === 'user').map(m => m.content);
    return {
      source: 'GeoProcess AI Assistant',
      service: '',
      projectDetails: userMessages.slice(-5).join('\n'),
      conversation: state.messages.slice(-10)
    };
  };

  const saveLeadContext = () => {
    try { sessionStorage.setItem('geoprocessAiLead', JSON.stringify(buildLeadSummary())); } catch (_) {}
  };

  const addMessage = (role, content) => {
    state.messages.push({ role, content });
    const box = document.querySelector('.gp-ai-messages');
    if (!box) return;
    const node = document.createElement('div');
    node.className = `gp-ai-msg ${role}`;
    node.textContent = content;
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
  };

  const addTyping = () => {
    const box = document.querySelector('.gp-ai-messages');
    if (!box) return null;
    const node = document.createElement('div');
    node.className = 'gp-ai-msg assistant';
    node.innerHTML = '<span class="gp-ai-typing"><span></span><span></span><span></span></span>';
    box.appendChild(node); box.scrollTop = box.scrollHeight; return node;
  };

  const showCards = () => {
    const box = document.querySelector('.gp-ai-messages');
    if (!box || box.querySelector('.gp-ai-card-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'gp-ai-card-wrap';
    wrap.innerHTML = `<div class="gp-ai-cards">${SERVICES.map(s => `<button class="gp-ai-card" type="button" data-ai-service="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>`;
    box.appendChild(wrap);
    wrap.querySelectorAll('[data-ai-service]').forEach(btn => btn.addEventListener('click', () => sendMessage(btn.dataset.aiService)));
  };

  const showHandoff = () => {
    if (state.leadPrompted) return;
    state.leadPrompted = true;
    saveLeadContext();
    const box = document.querySelector('.gp-ai-messages');
    if (!box) return;
    const wrap = document.createElement('div');
    wrap.className = 'gp-ai-handoff';
    wrap.innerHTML = `<a class="primary" href="${escapeHtml(CONTACT_URL)}">✉ Send Project Enquiry</a><a class="secondary" href="${escapeHtml(BOOKING_URL)}">📅 Book a Consultation</a><a class="secondary" href="${escapeHtml(WHATSAPP)}" target="_blank" rel="noopener">💬 WhatsApp the Team</a>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  };

  const shouldHandoff = (message) => {
    const q = message.toLowerCase();
    return state.turns >= 4 || /price|pricing|quote|quotation|proposal|tender|project|deadline|book|consult|need a team|outsource|subcontract/.test(q);
  };

  const askWorker = async (message) => {
    if (!WORKER_URL) return localAnswer(message);
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: state.messages.slice(-10) })
    });
    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const data = await response.json();
    return data.reply || data.response || 'I’m sorry, I could not generate a response right now.';
  };

  const sendMessage = async (message) => {
    const clean = String(message || '').trim();
    if (!clean) return;
    const input = document.querySelector('.gp-ai-input');
    if (input) input.value = '';
    addMessage('user', clean);
    state.turns += 1;
    const typing = addTyping();
    try {
      const reply = await askWorker(clean);
      typing?.remove();
      addMessage('assistant', reply);
      if (shouldHandoff(clean)) showHandoff();
      saveLeadContext();
      speak(reply);
    } catch (error) {
      typing?.remove();
      addMessage('assistant', 'I can still help with the basics here. For a detailed project discussion, please send an enquiry or book a consultation with our team.');
      showHandoff();
    }
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch (_) {}
  };

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = document.querySelector('.gp-ai-mic');
    if (!Recognition) { addMessage('assistant', 'Voice input is not available in this browser. You can still use the text chat.'); return; }
    if (state.listening) { state.recognition?.stop(); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    state.recognition = recognition;
    state.listening = true;
    mic?.classList.add('recording');
    recognition.onresult = (event) => sendMessage(event.results[0][0].transcript);
    recognition.onerror = () => { addMessage('assistant', 'I could not hear that clearly. Please try again or type your message.'); };
    recognition.onend = () => { state.listening = false; mic?.classList.remove('recording'); };
    recognition.start();
  };

  const render = () => {
    if (document.querySelector('.gp-ai-panel')) return;
    const panel = document.createElement('section');
    panel.className = 'gp-ai-panel';
    panel.setAttribute('aria-label', 'GeoProcess AI Assistant');
    panel.innerHTML = `
      <div class="gp-ai-head">
        <div class="gp-ai-brand"><div class="gp-ai-avatar">AI</div><div><div class="gp-ai-title">GeoProcess AI Assistant</div><div class="gp-ai-status">● Online · Ask about our services</div></div></div>
        <div class="gp-ai-head-actions"><button class="gp-ai-icon-btn gp-ai-clear" type="button" aria-label="Clear chat">↺</button><button class="gp-ai-icon-btn gp-ai-close" type="button" aria-label="Close chat">×</button></div>
      </div>
      <div class="gp-ai-messages"></div>
      <div class="gp-ai-foot">
        <div class="gp-ai-input-row"><textarea class="gp-ai-input" rows="1" placeholder="Type your project question…"></textarea><button class="gp-ai-mic" type="button" aria-label="Speak">🎙️</button><button class="gp-ai-send" type="button" aria-label="Send">➤</button></div>
        <div class="gp-ai-hint"><span>Text + voice</span><span class="gp-ai-powered">GeoProcess Consulting</span></div>
      </div>`;
    const launcher = document.createElement('button'); launcher.className='gp-ai-launcher'; launcher.type='button'; launcher.setAttribute('aria-label','Open GeoProcess AI Assistant'); launcher.textContent='🤖';
    document.body.appendChild(panel); document.body.appendChild(launcher);

    const input = panel.querySelector('.gp-ai-input');
    const sendBtn = panel.querySelector('.gp-ai-send');
    const mic = panel.querySelector('.gp-ai-mic');
    const open = () => { panel.classList.add('open'); state.open=true; input?.focus(); };
    const close = () => { panel.classList.remove('open'); state.open=false; };
    launcher.addEventListener('click', () => state.open ? close() : open());
    panel.querySelector('.gp-ai-close').addEventListener('click', close);
    panel.querySelector('.gp-ai-clear').addEventListener('click', () => { state.messages=[]; state.turns=0; state.leadPrompted=false; panel.querySelector('.gp-ai-messages').innerHTML=''; startConversation(); });
    sendBtn.addEventListener('click', () => sendMessage(input.value));
    mic.addEventListener('click', startVoice);
    input.addEventListener('keydown', (event) => { if (event.key==='Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(input.value); } });
    open();
    startConversation();
  };

  const startConversation = () => {
    setTimeout(() => {
      addMessage('assistant', 'Hi 👋 Welcome to GeoProcess Consulting. How can I help you today?');
      showCards();
    }, 100);
  };

  const boot = () => {
    const existing = document.querySelector('.gp-ai-panel');
    if (!existing) render();
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
