/* =========================================================
   GeoProcess Consulting - Booking Frontend
   ========================================================= */

const BOOKING_CONFIG = window.GEOPROCESS_BOOKING || {};
const BOOKING_API_URL = String(BOOKING_CONFIG.apiUrl || '').trim();
const BOOKING_TIME_ZONE = BOOKING_CONFIG.timeZone || 'Asia/Kolkata';

const detectedTimeZone =
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

let selectedTimeZone = detectedTimeZone;
let selectedBookingTime = null;
let currentRequestId = 0;


function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDateKey(year, month, day) {
  return [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

function addDaysToDateKey(dateKey, amount) {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function getDateKeyForTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });
  return formatDateKey(values.year, values.month, values.day);
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = part.value;
  });

  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return Math.round((asUTC - date.getTime()) / 60000);
}

function zonedDateTimeToDate(dateKey, timeValue, timeZone) {
  const dateParts = parseDateKey(dateKey);
  if (!dateParts || timeValue == null) return null;

  const raw = String(timeValue).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsedISO = new Date(raw);
    if (!Number.isNaN(parsedISO.getTime())) return parsedISO;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(raw);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = match[4] ? match[4].toUpperCase() : '';

  if (meridiem === 'AM' && hour === 12) hour = 0;
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  let guess = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
    guess = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hour, minute, second) - offsetMinutes * 60000;
  }
  return new Date(guess);
}

function formatLocalTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: selectedTimeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function formatDateKeyForDisplay(dateKey) {
  const parts = parseDateKey(dateKey);
  if (!parts) return 'Choose a date';
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(utcDate);
}

function formatSourceTimeForBusiness(dateKey, value) {
  const date = zonedDateTimeToDate(dateKey, value, BOOKING_TIME_ZONE);
  if (!date) return String(value || '');
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BOOKING_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true
  }).format(date);
}

function getFriendlyTimeZoneLabel(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'long'
    }).formatToParts(new Date());

    const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value || '';
    return zoneName && zoneName !== timeZone ? `${zoneName} · ${timeZone}` : timeZone;
  } catch (_) {
    return timeZone;
  }
}

function updateTimezoneUI() {
  const localZone = document.getElementById('booking-local-zone');
  if (localZone) {
    localZone.textContent = getFriendlyTimeZoneLabel(selectedTimeZone);
  }

  const dateHelp = document.getElementById('date-help');
  if (dateHelp) {
    dateHelp.textContent =
      `Your local time is detected automatically from your browser/device (${selectedTimeZone}). ` +
      'Every slot shows both your local time and the matching India time (IST).';
  }

  const selectedSlot = document.getElementById('selected-slot');
  if (selectedSlot) selectedSlot.dataset.timezone = selectedTimeZone;
}
function updateSelectedDateUI(dateKey) {
  const preview = document.getElementById('selected-date-preview');
  const detail = document.getElementById('selected-date-detail');
  const text = dateKey ? formatDateKeyForDisplay(dateKey) : 'Choose a date';
  if (preview) preview.textContent = text;
  if (detail) detail.textContent = dateKey ? text : 'No date selected';
}

function formatSlotForUser(sourceDate, slot) {
  const startDate = zonedDateTimeToDate(sourceDate, slot.start, BOOKING_TIME_ZONE);
  if (!startDate) return null;

  let endDate = zonedDateTimeToDate(sourceDate, slot.end, BOOKING_TIME_ZONE);
  if (endDate && endDate.getTime() < startDate.getTime()) endDate = new Date(endDate.getTime() + 86400000);

  return {
    sourceDate,
    sourceStart: slot.start,
    sourceEnd: slot.end,
    startDate,
    endDate,
    localDate: getDateKeyForTimeZone(startDate, selectedTimeZone),
    localStart: formatLocalTime(startDate),
    localEnd: endDate ? formatLocalTime(endDate) : '',
    available: slot.available === true,
    raw: slot
  };
}

function getVisitorTodayKey() {
  return getDateKeyForTimeZone(new Date(), selectedTimeZone);
}

function escapeHTML(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* =========================================================
   AVAILABILITY - JSONP (bypasses browser CORS)
   ========================================================= */

function getAvailability(date) {
  return new Promise((resolve, reject) => {
    if (!BOOKING_API_URL) {
      reject(new Error('Booking API URL is not configured.'));
      return;
    }

    const callbackName = `geoCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Availability request timed out.'));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Google Calendar availability connection failed.'));
    };

    script.src = `${BOOKING_API_URL}?action=availability&date=${encodeURIComponent(date)}&callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

async function loadTimeSlots(localDate) {
  const container = document.getElementById('time-slots');
  if (!container) return;

  const requestId = ++currentRequestId;
  selectedBookingTime = null;
  updateSelectedSlotUI(null);
  container.innerHTML = '<p>Loading available times…</p>';

  const sourceDates = Array.from(new Set([
    addDaysToDateKey(localDate, -1),
    localDate,
    addDaysToDateKey(localDate, 1)
  ].filter(Boolean)));

  try {
    const successfulResults = [];
    const failures = [];

    for (const sourceDate of sourceDates) {
      if (requestId !== currentRequestId) return;
      try {
        const result = await getAvailability(sourceDate);
        successfulResults.push({ sourceDate, result });
      } catch (error) {
        failures.push({ sourceDate, reason: error });
      }
    }

    if (requestId !== currentRequestId) return;
    if (!successfulResults.length) throw failures[0]?.reason || new Error('Unable to load availability.');

    const localSlots = [];
    successfulResults.forEach(({ sourceDate, result }) => {
      if (!result || !result.success) return;
      (result.slots || []).forEach((slot) => {
        if (slot.available !== true) return;
        const formatted = formatSlotForUser(sourceDate, slot);
        if (formatted && formatted.localDate === localDate) localSlots.push(formatted);
      });
    });

    const uniqueSlots = Array.from(new Map(localSlots.map((slot) => [
      `${slot.sourceDate}|${String(slot.sourceStart)}|${String(slot.sourceEnd)}`,
      slot
    ])).values()).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (!uniqueSlots.length) {
      container.innerHTML =
        `<p>No available consultation times remain for ${escapeHTML(formatDateKeyForDisplay(localDate))} ` +
        `in ${escapeHTML(selectedTimeZone)}. The calendar is open 24/7; try another date or refresh.</p>`;
      return;
    }

    container.innerHTML = '';
    uniqueSlots.forEach((slot) => {
      const button = document.createElement('button');
      const localText = slot.localStart + (slot.localEnd ? ` - ${slot.localEnd}` : '');
      const indiaStart = formatSourceTimeForBusiness(slot.sourceDate, slot.sourceStart);
      const indiaEnd = slot.sourceEnd ? formatSourceTimeForBusiness(slot.sourceDate, slot.sourceEnd) : '';
      const indiaText = indiaStart + (indiaEnd ? ` - ${indiaEnd}` : '');

      button.type = 'button';
      button.className = 'time-slot';
      button.innerHTML = `<span class="slot-local">${escapeHTML(localText)}</span><span class="slot-india">India · ${escapeHTML(indiaText)} IST</span>`;
      button.dataset.time = String(slot.sourceStart);
      button.dataset.date = slot.sourceDate;
      button.dataset.timezone = BOOKING_TIME_ZONE;
      button.setAttribute('aria-label', `Select ${localText}. India time ${indiaText} IST.`);

      button.addEventListener('click', () => {
        document.querySelectorAll('.time-slot').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
        selectedBookingTime = {
          date: slot.sourceDate,
          time: slot.sourceStart,
          end: slot.sourceEnd,
          displayStart: slot.localStart,
          displayEnd: slot.localEnd,
          indiaStart,
          indiaEnd,
          instant: slot.startDate
        };
        updateSelectedSlotUI(selectedBookingTime);
        showMessage('', '');
      });

      container.appendChild(button);
    });

    if (failures.length) {
      console.warn('Some adjacent booking dates could not be loaded:', failures.map((item) => item.reason));
    }
  } catch (error) {
    if (requestId !== currentRequestId) return;
    console.error('Availability error:', error);
    container.innerHTML = '<p>Unable to load available times. Please try again.</p>';
    showMessage('The calendar could not be loaded. Please refresh or try another date.', 'error');
  }
}

function updateSelectedSlotUI(slot) {
  const selected = document.getElementById('selected-slot');
  if (!selected) return;

  if (!slot) {
    selected.dataset.timezone = selectedTimeZone;
    selected.innerHTML = '<span>SELECTED SLOT</span><strong>No time selected</strong>';
    return;
  }

  const localText = slot.displayStart + (slot.displayEnd ? ` - ${slot.displayEnd}` : '');
  const indiaStart = slot.indiaStart || formatSourceTimeForBusiness(slot.date, slot.time);
  const indiaEnd = slot.indiaEnd || (slot.end ? formatSourceTimeForBusiness(slot.date, slot.end) : '');
  const indiaText = indiaStart + (indiaEnd ? ` - ${indiaEnd}` : '');

  selected.dataset.timezone = selectedTimeZone;
  selected.innerHTML = `<span>SELECTED SLOT</span><strong>${escapeHTML(localText)} · ${escapeHTML(selectedTimeZone)}</strong><small>India time: ${escapeHTML(indiaText)} IST</small>`;
}
function showMessage(message, type) {
  const box = document.getElementById('booking-message');
  if (!box) return;
  box.textContent = message;
  box.className = 'booking-message' + (type ? ` ${type}` : '');
}

async function submitBooking(event) {
  event.preventDefault();

  const dateInput = document.getElementById('booking-date');
  const nameInput = document.getElementById('customer-name');
  const emailInput = document.getElementById('customer-email');
  const phoneInput = document.getElementById('customer-phone');
  const companyInput = document.getElementById('customer-company');
  const serviceInput = document.getElementById('customer-service');
  const detailsInput = document.getElementById('customer-details');
  const submitButton = document.querySelector('#booking-form button[type="submit"]');

  if (!dateInput?.value) return showMessage('Please select a date.', 'error');
  if (!selectedBookingTime) return showMessage('Please select an available time slot.', 'error');
  if (!nameInput?.value.trim()) return showMessage('Please enter your name.', 'error');
  if (!emailInput?.value.trim()) return showMessage('Please enter your email.', 'error');

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting Request…';
  }
  showMessage('Submitting your booking request…', 'loading');

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput?.value.trim() || '',
    company: companyInput?.value.trim() || '',
    service: serviceInput?.value || '',
    date: selectedBookingTime.date,
    time: selectedBookingTime.time,
    details: detailsInput?.value.trim() || ''
  };

  try {
    const response = await fetch(BOOKING_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result || !result.success) {
      showMessage(result?.message || 'Booking could not be completed.', 'error');
      loadTimeSlots(dateInput.value);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Confirm Booking';
      }
      return;
    }

    showMessage('Request received! Your booking is pending review. You will receive an invitation email once confirmed.', 'success');
    document.getElementById('booking-form')?.reset();
    selectedBookingTime = null;
    updateSelectedSlotUI(null);
    loadTimeSlots(dateInput.value);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Confirm Booking';
    }
  } catch (error) {
    console.error('Booking submission error:', error);
    showMessage('Unable to submit booking request. Please check your internet connection and try again.', 'error');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Confirm Booking';
    }
  }
}

function setupBookingDate() {
  const dateInput = document.getElementById('booking-date');
  if (!dateInput) return;

  dateInput.min = getVisitorTodayKey();
  updateSelectedDateUI(dateInput.value || '');

  dateInput.addEventListener('change', () => {
    selectedBookingTime = null;
    updateSelectedSlotUI(null);
    updateSelectedDateUI(dateInput.value || '');
    if (!dateInput.value) {
      document.getElementById('time-slots').innerHTML = '<p>Select a date to see available times.</p>';
      return;
    }
    loadTimeSlots(dateInput.value);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateTimezoneUI();
  setupBookingDate();
  const form = document.getElementById('booking-form');
  if (form) form.addEventListener('submit', submitBooking);
});
