(() => {
  'use strict';

  const cfg = window.GEOPROCESS_AI || {};
  const WORKER_URL = String(cfg.workerUrl || '').trim();
  const COMPANY = cfg.companyName || 'GeoProcess Consulting';
  const CONTACT_EMAIL = cfg.contactEmail || 'contact@geoprocessconsulting.in';
  const CONTACT_URL = cfg.contactUrl || '/contact/#project-enquiry';
  const BOOKING_URL = cfg.bookingUrl || '/booking/';
  const WHATSAPP = cfg.whatsappUrl || 'https://wa.me/917205666324';
  const KNOWLEDGE_URL = cfg.knowledgeUrl || 'data/ai-knowledge.json';
  const TECHNICAL_URL = cfg.technicalKnowledgeUrl || 'data/ai-technical-questions.json';

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
    'LiDAR Data Processing & Classification': 'GeoProcess processes raw LiDAR point clouds into structured classes and engineering-ready information, including ground, vegetation, buildings and infrastructure, with cleansing, feature extraction and QA/QC.',
    'Powerline LiDAR & Vegetation Analysis': 'GeoProcess processes LiDAR for powerline corridors, vegetation proximity, danger-zone identification and operational decision support.',
    'GIS Mapping & Spatial Data Management': 'GeoProcess builds structured GIS layers and spatial databases for assets, utilities, infrastructure, mapping, analysis and operational workflows.',
    'Photogrammetry & Aerial Mapping': 'GeoProcess processes aerial imagery into mapping and 3D outputs, including photogrammetry workflows, orthophoto products and elevation information.',
    '3D Mapping & Geospatial Modeling': 'GeoProcess creates measurable 3D representations of terrain, corridors, assets and structures for visualization, analysis, GIS, CAD and engineering workflows.',
    'Scan-to-BIM / BIM': 'GeoProcess turns laser-scanning and point-cloud information into accurate as-built BIM outputs for architectural, structural and MEP workflows.',
    'DTM / DSM / DEM': 'GeoProcess produces terrain and surface models from LiDAR, imagery and elevation datasets, including bare-earth DTM, DSM and related elevation products.',
    'Utility / Pipeline / Telecom GIS': 'GeoProcess prepares spatial datasets and feature workflows for utility, pipeline, telecom, corridor and infrastructure programs.',
    'CAD / Engineering Data': 'GeoProcess converts survey, scan and spatial information into clean CAD-ready drawings and structured engineering deliverables.',
    'Geospatial Automation / QA/QC': 'GeoProcess develops repeatable geospatial workflows and production QA/QC checks for validation, analysis, annotation and consistent delivery.'
  };

  const state = {
    open: false,
    started: false,
    turns: 0,
    messages: [],
    leadPrompted: false,
    selectedService: '',
    listening: false,
    recognition: null,
    knowledge: null,
    knowledgePromise: null,
    technical: null,
    technicalPromise: null
  };

  const STOPWORDS = new Set([
    'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'do', 'does',
    'for', 'from', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on', 'or', 'our',
    'the', 'this', 'to', 'what', 'when', 'where', 'which', 'who', 'with', 'you', 'your'
  ]);

  const TERM_EXPANSIONS = {
    gis: ['geographic information system', 'spatial information', 'mapping', 'gis'],
    lidar: ['light detection and ranging', 'point cloud', 'laser scanning', 'lidar'],
    bim: ['building information modeling', 'building information modelling', 'digital twin', 'scan-to-bim', 'bim'],
    cad: ['computer aided design', 'engineering drawings', 'cad'],
    photogrammetry: ['aerial imagery', '3d reconstruction', 'orthophoto', 'photogrammetry'],
    dtm: ['digital terrain model', 'bare earth', 'terrain model', 'dtm'],
    dsm: ['digital surface model', 'surface model', 'dsm'],
    dem: ['digital elevation model', 'elevation', 'dem'],
    'point cloud': ['lidar', '3d points', 'classification', 'point cloud'],
    'powerline': ['utility corridor', 'vegetation', 'danger zone', 'conductor', 'powerline'],
    'scan-to-bim': ['bim', 'laser scanning', 'point cloud', 'as-built'],
    'ai/ml': ['artificial intelligence', 'machine learning', 'gis', 'classification', 'ai/ml']
  };

  const escapeAttr = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const getPageName = () => {
    const path = window.location.pathname || '/';
    return path === '/' ? 'index.html' : path.split('/').filter(Boolean).pop() || 'index.html';
  };

  const normalize = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#/\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokenize = (value) => normalize(value)
    .split(' ')
    .filter(Boolean)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));

  const saveLeadContext = () => {
    try {
      sessionStorage.setItem('geoprocessAiLead', JSON.stringify({
        source: 'GeoProcess AI Assistant',
        page: getPageName(),
        service: state.selectedService,
        projectDetails: state.messages
          .filter((m) => m.role === 'user')
          .map((m) => m.content)
          .slice(-8)
          .join('\n'),
        conversation: state.messages.slice(-10),
        createdAt: new Date().toISOString()
      }));
    } catch (_) {}
  };

  const addMessage = (role, content) => {
    const text = String(content || '').trim();
    if (!text) return;
    state.messages.push({ role, content: text });
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box) return;
    const node = document.createElement('div');
    node.className = `gp-ai-msg ${role}`;
    node.textContent = text;
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
    const recent = state.messages
      .slice(-8)
      .map((m) => `${m.role === 'user' ? 'Visitor' : 'AI'}: ${m.content}`)
      .join('\n');
    const project = state.messages
      .filter((m) => m.role === 'user')
      .slice(-6)
      .map((m) => m.content)
      .join('\n');
    const message = [
      `Hello ${COMPANY},`,
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
    wrap.innerHTML = `<div class="gp-ai-card-label">Quick topics</div><div class="gp-ai-cards">${SERVICES.slice(0, 6)
      .map((service) => `<button class="gp-ai-card" type="button" data-ai-service="${escapeAttr(service)}">${escapeAttr(service)}</button>`)
      .join('')}<button class="gp-ai-card" type="button" data-ai-question="What is LiDAR?">What is LiDAR?</button><button class="gp-ai-card" type="button" data-ai-question="What is GIS?">What is GIS?</button><button class="gp-ai-card" type="button" data-ai-question="What is BIM?">What is BIM?</button></div>`;
    box.appendChild(wrap);
    wrap.querySelectorAll('[data-ai-service]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedService = btn.dataset.aiService || state.selectedService;
        sendMessage(btn.dataset.aiService || '');
      });
    });
    wrap.querySelectorAll('[data-ai-question]').forEach((btn) => {
      btn.addEventListener('click', () => sendMessage(btn.dataset.aiQuestion || ''));
    });
  };

  const showHandoff = () => {
    if (state.leadPrompted) {
      updateWhatsAppLink();
      return;
    }
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

  const showContactLinks = () => {
    const box = document.querySelector('#gp-ai-root .gp-ai-messages');
    if (!box || box.querySelector('.gp-ai-contact-card')) return;
    const wrap = document.createElement('div');
    wrap.className = 'gp-ai-contact-card';
    wrap.innerHTML = `
      <div class="gp-ai-card-label">Contact GeoProcess Consulting</div>
      <a href="${escapeAttr(WHATSAPP)}" target="_blank" rel="noopener">💬 WhatsApp · +91 (720) 56 66324</a>
      <a href="mailto:${escapeAttr(CONTACT_EMAIL)}">✉ ${escapeAttr(CONTACT_EMAIL)}</a>
      <a href="${escapeAttr(BOOKING_URL)}">📅 Book a Consultation</a>
      <a href="${escapeAttr(CONTACT_URL)}">📝 Send a Project Enquiry</a>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  };

  const shouldHandoff = (message) => {
    const q = normalize(message);
    return state.turns >= 4 || /price|pricing|quote|quotation|proposal|tender|deadline|book|consult|outsource|subcontract|project|requirement|scope|delivery|sample|dataset|data volume/.test(q);
  };

  const shouldShowContact = (message) => /contact|email|mail|whatsapp|phone|mobile|number|reach|talk to your team/.test(normalize(message));

  const fallbackAnswer = (message) => {
    const q = normalize(message);

    if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)\b/.test(q)) {
      return `Hi! I’m the ${COMPANY} AI Assistant. Ask me about our services, LiDAR, GIS, BIM, photogrammetry, DTM/DSM/DEM, or anything covered in our Study Hub.`;
    }
    if (/^(thanks|thank you|thx|great thanks)\b/.test(q)) {
      return 'You’re welcome. I’m here whenever you need help with a GeoProcess service or a technical geospatial question.';
    }
    if (/^(bye|goodbye|see you)\b/.test(q)) {
      return 'Thanks for visiting GeoProcess Consulting. Come back anytime.';
    }

    const service = SERVICES.find((name) => {
      const n = normalize(name);
      return q === n || q.includes(n) || n.includes(q);
    });
    if (service) return SERVICE_ANSWERS[service];

    if (/what services|services do you offer|capabilities|what can you do/.test(q)) {
      return 'GeoProcess Consulting works across LiDAR processing and classification, powerline and vegetation analysis, GIS mapping and spatial data management, photogrammetry and aerial mapping, 3D mapping, Scan-to-BIM/BIM, terrain models, utility/pipeline/telecom GIS, CAD/engineering data, and geospatial automation and QA/QC.';
    }
    if (/\bgis\b/.test(q) && /what is|explain|mean/.test(q)) {
      return 'GIS stands for Geographic Information System. It is a system for storing, managing, analyzing and visualizing information that has a geographic location. In GeoProcess workflows, GIS can be used for mapping, spatial databases, utilities, infrastructure and analysis.';
    }
    if (/\blidar\b/.test(q) && /what is|explain|mean/.test(q)) {
      return 'LiDAR stands for Light Detection and Ranging. It uses laser measurements to create dense 3D spatial information, often represented as a point cloud. GeoProcess uses LiDAR data for classification, terrain modeling, corridor analysis and other geospatial workflows.';
    }
    if (/\bbim\b/.test(q) && /what is|explain|mean/.test(q)) {
      return 'BIM stands for Building Information Modeling. It is a structured digital representation of a building or asset that can support design, documentation, coordination and lifecycle workflows. GeoProcess also works with Scan-to-BIM and BIM outputs.';
    }
    if (/email|mail/.test(q)) return `Our official email is ${CONTACT_EMAIL}.`;
    if (/whatsapp|whats app|phone|mobile|number/.test(q)) return 'Our WhatsApp number is +91 (720) 56 66324.';
    if (/book|consultation|appointment/.test(q)) return 'You can book a consultation through the Book a Consultation page.';

    return `I can help with ${COMPANY}'s services and the technical subjects covered in the Study Hub. Ask me a specific question, such as “What is GIS?”, “What is LiDAR?”, “What is BIM?”, or “What services do you provide?”`;
  };

  const loadKnowledge = async () => {
    if (state.knowledge) return state.knowledge;
    if (state.knowledgePromise) return state.knowledgePromise;
    state.knowledgePromise = fetch(KNOWLEDGE_URL, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Knowledge request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        state.knowledge = data;
        return data;
      })
      .catch((error) => {
        console.warn('GeoProcess AI knowledge could not be loaded:', error);
        state.knowledge = { sitePages: [], studySections: [] };
        return state.knowledge;
      });
    return state.knowledgePromise;
  };

  const loadTechnicalBank = async () => {
    if (state.technical) return state.technical;
    if (state.technicalPromise) return state.technicalPromise;
    state.technicalPromise = fetch(TECHNICAL_URL, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Technical bank request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        state.technical = data;
        return data;
      })
      .catch((error) => {
        console.warn('GeoProcess technical question bank could not be loaded:', error);
        state.technical = { items: [] };
        return state.technical;
      });
    return state.technicalPromise;
  };

  const searchTechnicalBank = async (query) => {
    const data = await loadTechnicalBank();
    const items = Array.isArray(data.items) ? data.items : [];
    const q = normalize(query);
    const qTokens = [...new Set(tokenize(q))];
    return items
      .map((item) => {
        const hay = normalize(`${item.category} ${item.question} ${item.answer}`);
        let score = 0;
        if (hay.includes(q) && q.length > 8) score += 20;
        qTokens.forEach((token) => { if (token.length > 2 && hay.includes(token)) score += 1; });
        const category = normalize(item.category);
        if (category && q.includes(category.split(' ')[0])) score += 1;
        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  };

  const expandedQuery = (query) => {
    const q = normalize(query);
    const expanded = [q];
    Object.entries(TERM_EXPANSIONS).forEach(([term, aliases]) => {
      if (q.includes(term)) expanded.push(...aliases);
    });
    return expanded.join(' ');
  };

  const scoreText = (query, title, text) => {
    const q = expandedQuery(query);
    const qTokens = [...new Set(tokenize(q))];
    if (!qTokens.length) return 0;
    const hay = normalize(`${title} ${text}`);
    let score = 0;
    qTokens.forEach((token) => {
      if (hay.includes(token)) score += 1;
      const phrase = q.includes(`${token} `) && token.length > 4;
      if (phrase && hay.includes(token)) score += 0.3;
    });
    const nq = normalize(query);
    if (nq && hay.includes(nq)) score += 8;
    if (hay.startsWith(nq)) score += 2;
    return score;
  };

  const searchKnowledge = async (query) => {
    const data = await loadKnowledge();
    const results = [];
    (data.sitePages || []).forEach((page) => {
      const score = scoreText(query, page.title, page.text);
      if (score > 0) results.push({ type: 'site', title: page.title, text: page.text, score });
    });
    (data.studySections || []).forEach((section) => {
      const score = scoreText(query, section.title, section.text);
      if (score > 0) results.push({ type: 'study', title: section.title, text: section.text, score });
    });
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 6);
  };

  const buildWorkerMessage = async (question) => {
    const lower = normalize(question);
    const likelyTechnical = /gis|lidar|bim|cad|photogrammetry|point cloud|dtm|dsm|dem|terrain|georefer|survey|topograph|qaqc|annotation|python|arcpy|pyqgis|postgis|arcgis|terrasolid|lastools|global mapper|powerline|vegetation|3d|digital twin|ai|machine learning|what is|difference|explain|how does|study/.test(lower);
    const likelyCompany = /service|services|project|about|company|capabilit|contact|email|whatsapp|booking|consultation|pricing|quote/.test(lower);
    if (!likelyTechnical && !likelyCompany) return question.slice(0, 3600);

    const [matches, technicalMatches] = await Promise.all([
      searchKnowledge(question),
      likelyTechnical ? searchTechnicalBank(question) : Promise.resolve([])
    ]);

    let context = '';
    for (const match of matches) {
      const snippet = String(match.text || '').slice(0, 760);
      const block = `[${match.type === 'study' ? 'Study Hub' : 'Website'}] ${match.title}\n${snippet}`;
      if ((context.length + block.length + 4) > 2100) break;
      context += `${block}\n\n`;
    }

    if (technicalMatches.length) {
      context += 'TECHNICAL QUESTION BANK:\n';
      for (const item of technicalMatches.slice(0, 3)) {
        const block = `Q: ${item.question}\nA: ${item.answer}`;
        if ((context.length + block.length + 4) > 3450) break;
        context += `${block}\n\n`;
      }
    }

    if (!context.trim()) return question.slice(0, 3600);

    const instruction = [
      'Answer the visitor naturally and helpfully as the GeoProcess Consulting website AI Assistant.',
      'Use the website and Study Hub context as the primary source for GeoProcess-specific facts.',
      'For technical education questions, use the Technical Question Bank below as a trusted answer aid and explain the concept in simple professional language.',
      'You may use ordinary technical knowledge to clarify a technical explanation, but do not invent GeoProcess capabilities, clients, certifications, pricing, guarantees or project results.',
      'For questions about booking, contact details or company services, use only supported information and point the visitor to the existing Contact or Booking page when appropriate.',
      '',
      'CONTEXT:',
      context,
      'VISITOR QUESTION:',
      question
    ].join('\n');

    return instruction.slice(0, 3900);
  };

  const askWorker = async (message) => {
    const technicalMatches = await searchTechnicalBank(message);
    if (!WORKER_URL) {
      return technicalMatches[0]?.answer || fallbackAnswer(message);
    }

    const workerMessage = await buildWorkerMessage(message);
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: workerMessage, history: state.messages.slice(-8) })
    });
    if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
    const data = await response.json();
    return data.reply || technicalMatches[0]?.answer || fallbackAnswer(message);
  };

  const sendMessage = async (message) => {
    const clean = String(message || '').trim();
    if (!clean) return;
    const input = document.querySelector('#gp-ai-root .gp-ai-input');
    if (input) input.value = '';
    addMessage('user', clean);
    state.turns += 1;

    const matched = SERVICES.find((service) => {
      const q = normalize(clean);
      const n = normalize(service);
      return q === n || q.includes(n) || n.includes(q);
    });
    if (matched) state.selectedService = matched;

    if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|thanks|thank you|bye|goodbye)\b/i.test(clean)) {
      addMessage('assistant', fallbackAnswer(clean));
      return;
    }

    const typing = addTyping();
    try {
      const reply = await askWorker(clean);
      typing?.remove();
      addMessage('assistant', reply);
      if (shouldShowContact(clean)) showContactLinks();
      if (shouldHandoff(clean)) showHandoff();
    } catch (error) {
      console.error('GeoProcess AI assistant error:', error);
      typing?.remove();
      const technicalFallback = await searchTechnicalBank(clean);
      addMessage('assistant', technicalFallback[0]?.answer || fallbackAnswer(clean));
      if (shouldShowContact(clean)) showContactLinks();
      if (shouldHandoff(clean)) showHandoff();
    }
  };

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const mic = document.querySelector('#gp-ai-root .gp-ai-mic');
    if (!Recognition) {
      addMessage('assistant', 'Voice input is not available in this browser. You can use the text chat instead.');
      return;
    }
    if (state.listening) {
      state.recognition?.stop();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    state.recognition = recognition;
    state.listening = true;
    mic?.classList.add('recording');
    recognition.onresult = (event) => sendMessage(event.results[0][0].transcript);
    recognition.onerror = () => addMessage('assistant', 'I could not hear that clearly. Please try again or type your message.');
    recognition.onend = () => {
      state.listening = false;
      mic?.classList.remove('recording');
    };
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
      addMessage('assistant', `Hi 👋 Welcome to ${COMPANY}. I’m the ${COMPANY} AI Assistant. Ask me about our services, technical geospatial topics, or anything covered in the Study Hub.`);
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
      <section class="gp-ai-panel" aria-label="${escapeAttr(COMPANY)} AI Assistant">
        <div class="gp-ai-head">
          <div class="gp-ai-brand">
            <div class="gp-ai-avatar">AI</div>
            <div><div class="gp-ai-title">${escapeAttr(COMPANY)} AI Assistant</div><div class="gp-ai-status">● Online · website knowledge assistant</div></div>
          </div>
          <div class="gp-ai-head-actions">
            <button class="gp-ai-icon-btn gp-ai-clear" type="button" aria-label="Clear chat">↺</button>
            <button class="gp-ai-icon-btn gp-ai-close" type="button" aria-label="Close chat">×</button>
          </div>
        </div>
        <div class="gp-ai-messages" aria-live="polite"></div>
        <div class="gp-ai-foot">
          <div class="gp-ai-input-row">
            <textarea class="gp-ai-input" rows="1" placeholder="Ask about a service, GIS, LiDAR, BIM or your project…"></textarea>
            <button class="gp-ai-mic" type="button" aria-label="Speak">🎙️</button>
            <button class="gp-ai-send" type="button" aria-label="Send">➤</button>
          </div>
          <div class="gp-ai-hint"><span>Site + Study Hub</span><span>${escapeAttr(COMPANY)}</span></div>
        </div>
      </section>
      <button class="gp-ai-launcher" type="button" aria-label="Open ${escapeAttr(COMPANY)} AI Assistant">🤖</button>`;

    document.body.appendChild(root);
    const input = root.querySelector('.gp-ai-input');
    root.querySelector('.gp-ai-launcher').addEventListener('click', () => state.open ? closePanel() : openPanel());
    root.querySelector('.gp-ai-close').addEventListener('click', closePanel);
    root.querySelector('.gp-ai-clear').addEventListener('click', clearChat);
    root.querySelector('.gp-ai-send').addEventListener('click', () => sendMessage(input.value));
    root.querySelector('.gp-ai-mic').addEventListener('click', startVoice);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(input.value);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    render();
    loadTechnicalBank();
  });
})();
