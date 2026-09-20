(() => {
  'use strict';

  const cfg = window.GEOPROCESS_AI || {};
  const WORKER_URL = String(cfg.workerUrl || '').trim();
  const CONTACT_URL = cfg.contactUrl || 'contact.html#project-enquiry';
  const BOOKING_URL = cfg.bookingUrl || 'booking.html';
  const WHATSAPP = cfg.whatsappUrl || 'https://wa.me/917205666324';

  const SERVICES = [
    'LiDAR Data Processing & Classification',
    'Powerline LiDAR & Vegetation Analysis',
    'GIS Mapping & Spatial Data Management',
    'Photogrammetry & Aerial Mapping',
    '3D Mapping & Geospatial Modeling',
    'Scan-to-BIM / BIM',
    'DTM / DSM / DEM',
    'Utility / Pipeline / Telecom GIS',
    'CAD / Engineering Data',
    'Geospatial Automation / QA/QC'
  ];

  const SERVICE_ANSWERS = {
    'LiDAR Data Processing & Classification': 'We convert raw point clouds into accurate, structured classes and engineering-ready information, including ground, non-ground and vegetation classification, noise removal, cleansing and QA/QC, feature extraction, vectorization and point-cloud colorization.',
    'Powerline LiDAR & Vegetation Analysis': 'We process LiDAR for powerline corridors and vegetation analysis, including vegetation proximity, danger-zone identification and operational decision support.',
    'GIS Mapping & Spatial Data Management': 'We build reliable spatial databases, maps and structured layers for analysis and asset management, including GIS data capture, conversion and structuring, parcel, utility and infrastructure mapping, spatial analysis, map production and GIS databases.',
    'Photogrammetry & Aerial Mapping': 'We derive measurements, maps and 3D models from overlapping aerial and terrestrial imagery, including ground control, tie-point workflows, block adjustment, 3D reconstruction and topographic outputs.',
    '3D Mapping & Geospatial Modeling': 'We create measurable 3D representations of terrain, corridors, assets, structures and project environments. This includes 3D asset and corridor modeling, terrain and infrastructure visualization, and models for GIS, CAD and engineering workflows.',
    'Scan-to-BIM / BIM': 'We turn terrestrial laser-scanning and point-cloud data into accurate as-built models and BIM outputs for buildings, structures and MEP, including architectural, structural and MEP modeling.',
    'DTM / DSM / DEM': 'We produce dependable terrain and surface models from LiDAR, imagery and elevation datasets, including bare-earth DTM, DSM surface models, contours, elevation products and terrain analysis.',
    'Utility / Pipeline / Telecom GIS': 'We prepare spatial datasets and feature extraction workflows for network, corridor and infrastructure programs, including utility, pipeline and telecom GIS and asset mapping.',
    'CAD / Engineering Data': 'We transform survey, scan and spatial information into clean CAD-ready drawings and structured engineering deliverables, including GIS-to-CAD conversion, asset and feature extraction and engineering-ready outputs.',
    'Geospatial Automation / QA/QC': 'We build repeatable geospatial workflows and quality checks that improve consistency, including spatial analysis, production QA/QC, validation, data annotation and automation workflows.'
  };

  const state = {
    open: false,
    started: false,
    turns: 0,
    messages: [],
    leadPrompted: false,
    selectedService: '',
    listening: false,
    recognition: null
  };

  const escapeAttr = (value) => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getPageName = () => window.location.pathname.split('/').pop() || 'index.html';

  const saveLeadContext = () => {
    try {
      sessionStorage.setItem('geoprocessAiLead', JSON.stringify({
        source: 'GeoProcess AI Assistant',
        page: getPageName(),
        service: state.selectedService,
        projectDetails: state.messages.filter(m => m.role === 'user').map(m => m.content).slice(-8).join('\n'),
        conversation: state.messages.slice(-10),
        createdAt: new Date().toISOString()
      }));
    } catch (_) {}
  };

  const addMessage = (role, content) => {
    state.messages.push({ role, content: String(content || '') });
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box) return;
    const node = document.createElement('div');
    node.className = `gp-ai-msg ${role}`;
    node.textContent = content;
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
    saveLeadContext();
    updateWhatsAppLink();
  };

  const addTyping = () => {
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box) return null;
    const node = document.createElement('div');
    node.className = 'gp-ai-msg assistant';
    node.innerHTML = '<span class="gp-ai-typing"><span></span><span></span><span></span></span>';
    box.appendChild(node);
    box.scrollTop = box.scrollHeight;
    return node;
  };

  const buildWhatsAppUrl = () => {
    const recent = state.messages.slice(-8).map(m => `${m.role === 'user' ? 'Visitor' : 'AI'}: ${m.content}`).join('\n');
    const project = state.messages.filter(m => m.role === 'user').slice(-6).map(m => m.content).join('\n');
    const message = [
      'Hello GeoProcess Consulting,',
      '',
      'I was speaking with the GeoProcess AI Assistant and would like to continue the discussion with your team.',
      state.selectedService ? `Service: ${state.selectedService}` : '',
      project ? `Project details:\n${project.slice(0, 1800)}` : '',
      '',
      'Recent conversation:',
      recent.slice(0, 2600)
    ].filter(Boolean).join('\n');
    return `${String(WHATSAPP).replace(/\/+$/, '')}?text=${encodeURIComponent(message)}`;
  };

  const updateWhatsAppLink = () => {
    const link = document.querySelector('#gp-ai-root .gp-ai-whatsapp');
    if (link) link.href = buildWhatsAppUrl();
  };

  const showCards = () => {
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box || box.querySelector('.gp-ai-card-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'gp-ai-card-wrap';
    wrap.innerHTML = `<div class="gp-ai-card-label">Quick topics</div><div class="gp-ai-cards">${SERVICES.slice(0, 6).map(s => `<button class="gp-ai-card" type="button" data-ai-service="${escapeAttr(s)}">${escapeAttr(s)}</button>`).join('')}</div>`;
    box.appendChild(wrap);
    wrap.querySelectorAll('[data-ai-service]').forEach(btn => btn.addEventListener('click', () => {
      state.selectedService = btn.dataset.aiService || state.selectedService;
      sendMessage(btn.dataset.aiService);
    }));
  };

  const showHandoff = () => {
    if (state.leadPrompted) { updateWhatsAppLink(); return; }
    state.leadPrompted = true;
    saveLeadContext();
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box) return;
    const wrap = document.createElement('div');
    wrap.className = 'gp-ai-handoff';
    wrap.innerHTML = `
      <div class="gp-ai-handoff-title">Would you like to continue with our team?</div>
      <div class="gp-ai-handoff-note">Your recent AI conversation will be included in the WhatsApp message.</div>
      <a class="primary gp-ai-whatsapp" href="${escapeAttr(buildWhatsAppUrl())}" target="_blank" rel="noopener">💬 Continue on WhatsApp</a>
      <a class="secondary" href="${escapeAttr(CONTACT_URL)}">✉ Send Project Enquiry</a>
      <a class="secondary" href="${escapeAttr(BOOKING_URL)}">📅 Book a Consultation</a>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
    updateWhatsAppLink();
  };

  const shouldHandoff = (message) => {
    const q = String(message).toLowerCase();
    return state.turns >= 4 || /price|pricing|quote|quotation|proposal|tender|deadline|book|consult|outsource|subcontract|project|requirement|scope|delivery|sample|dataset|data volume/.test(q);
  };

  const fallbackAnswer = (message) => {
    const q = String(message || '').toLowerCase().trim();
    const service = SERVICES.find(name => {
      const n = name.toLowerCase();
      return q === n || q.includes(n) || n.includes(q);
    });
    if (service) return SERVICE_ANSWERS[service];

    if (/3d mapping|geospatial modeling|3d modeling|3d modelling/.test(q)) return SERVICE_ANSWERS['3D Mapping & Geospatial Modeling'];
    if (/why (should|would|do) i choose geoprocess|why choose geoprocess|what makes geoprocess/.test(q)) {
      return 'GeoProcess Consulting highlights four reasons to choose its services: actionable intelligence, unmatched precision, deep domain expertise in utility corridors and vegetation management, and proactive cost savings through predictive pruning schedules.';
    }
    if (/what services|services do you offer|capabilities|what can you do/.test(q)) {
      return 'GeoProcess Consulting offers LiDAR processing and classification, GIS mapping and spatial data management, 3D mapping and geospatial modeling, 3D laser scanning and Scan-to-BIM, photogrammetry and aerial mapping, orthophoto/ortho-mosaic production, DTM/DSM/DEM generation, BIM services including LOD 400 and LOD 500, mobile mapping and asset extraction, utility/pipeline/telecom GIS, CAD conversion and engineering data, and geospatial automation, analysis and QA/QC.';
    }
    if (/whatsapp|whats app|phone|mobile|number/.test(q)) return 'Our WhatsApp number is +91 (720) 56 66324. You can use the WhatsApp button below to continue with our team.';
    if (/email|mail/.test(q)) return 'Our contact email is contact@geoprocessconsulting.in.';
    return 'Tell me what you would like to know about GeoProcess Consulting, a specific service, a project, or your requirements.';
  };

  const askWorker = async (message) => {
    if (!WORKER_URL) return fallbackAnswer(message);
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: state.messages.slice(-8) })
    });
    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const data = await response.json();
    return data.reply || fallbackAnswer(message);
  };

  const sendMessage = async (message) => {
    const clean = String(message || '').trim();
    if (!clean) return;
    const input = document.querySelector('#gp-ai-root .gp-ai-input');
    if (input) input.value = '';
    addMessage('user', clean);
    state.turns += 1;
    const matched = SERVICES.find(s => { const q = clean.toLowerCase(); const n = s.toLowerCase(); return q === n || q.includes(n) || n.includes(q) || (n.startsWith('3d') && /3d.*(mapping|modeling|modelling)/.test(q)); });
    if (matched) state.selectedService = matched;
    const typing = addTyping();
    try {
      const reply = await askWorker(clean);
      typing?.remove();
      addMessage('assistant', reply);
      if (shouldHandoff(clean)) showHandoff();
    } catch (error) {
      console.error('GeoProcess AI assistant error:', error);
      typing?.remove();
      const reply = fallbackAnswer(clean);
      addMessage('assistant', reply);
      if (shouldHandoff(clean)) showHandoff();
    }
  };

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = document.querySelector('#gp-ai-root .gp-ai-mic');
    if (!Recognition) { addMessage('assistant', 'Voice input is not available in this browser. You can use the text chat instead.'); return; }
    if (state.listening) { state.recognition?.stop(); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    state.recognition = recognition;
    state.listening = true;
    mic?.classList.add('recording');
    recognition.onresult = event => sendMessage(event.results[0][0].transcript);
    recognition.onerror = () => addMessage('assistant', 'I could not hear that clearly. Please try again or type your message.');
    recognition.onend = () => { state.listening = false; mic?.classList.remove('recording'); };
    recognition.start();
  };

  const openPanel = () => {
    const root = document.getElementById('gp-ai-root');
    const panel = root?.querySelector('.gp-ai-panel');
    const input = root?.querySelector('.gp-ai-input');
    if (!panel) return;
    panel.classList.add('open');
    state.open = true;
    if (!state.started) {
      state.started = true;
      addMessage('assistant', 'Hi 👋 Welcome to GeoProcess Consulting. I’m the GeoProcess AI Assistant. How can I help you today?');
      showCards();
    }
    input?.focus();
  };

  const closePanel = () => {
    const panel = document.querySelector('#gp-ai-root .gp-ai-panel');
    if (panel) panel.classList.remove('open');
    state.open = false;
  };

  const clearChat = () => {
    state.messages = [];
    state.turns = 0;
    state.leadPrompted = false;
    state.selectedService = '';
    state.started = false;
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (box) box.innerHTML = '';
    openPanel();
  };

  const render = () => {
    if (document.getElementById('gp-ai-root')) return;
    const root = document.createElement('div');
    root.id = 'gp-ai-root';
    root.innerHTML = `
      <section class="gp-ai-panel" aria-label="GeoProcess AI Assistant">
        <div class="gp-ai-head">
          <div class="gp-ai-brand">
            <div class="gp-ai-avatar">AI</div>
            <div><div class="gp-ai-title">GeoProcess AI Assistant</div><div class="gp-ai-status">● Online · GeoProcess website assistant</div></div>
          </div>
          <div class="gp-ai-head-actions">
            <button class="gp-ai-icon-btn gp-ai-clear" type="button" aria-label="Clear chat">↺</button>
            <button class="gp-ai-icon-btn gp-ai-close" type="button" aria-label="Close chat">×</button>
          </div>
        </div>
        <div class="gp-ai-messages"></div>
        <div class="gp-ai-foot">
          <div class="gp-ai-input-row">
            <textarea class="gp-ai-input" rows="1" placeholder="Ask about a service or your project…"></textarea>
            <button class="gp-ai-mic" type="button" aria-label="Speak">🎙️</button>
            <button class="gp-ai-send" type="button" aria-label="Send">➤</button>
          </div>
          <div class="gp-ai-hint"><span>Text + voice</span><span>GeoProcess Consulting</span></div>
        </div>
      </section>
      <button class="gp-ai-launcher" type="button" aria-label="Open GeoProcess AI Assistant">🤖</button>`;
    document.body.appendChild(root);

    const input = root.querySelector('.gp-ai-input');
    root.querySelector('.gp-ai-launcher').addEventListener('click', () => state.open ? closePanel() : openPanel());
    root.querySelector('.gp-ai-close').addEventListener('click', closePanel);
    root.querySelector('.gp-ai-clear').addEventListener('click', clearChat);
    root.querySelector('.gp-ai-send').addEventListener('click', () => sendMessage(input.value));
    root.querySelector('.gp-ai-mic').addEventListener('click', startVoice);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); } });
  };

  document.addEventListener('DOMContentLoaded', render);
})();
