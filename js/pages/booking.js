/* =========================================================
   GeoProcess Consulting - Booking Frontend
   ========================================================= */

/*
 * The API/calendar uses a canonical timezone (IST by default).
 * The browser converts those slots to the visitor's local timezone.
 */
const BOOKING_CONFIG = window.GEOPROCESS_BOOKING || {};
const BOOKING_API_URL =
  BOOKING_CONFIG.apiUrl ||
  "https://script.google.com/macros/s/AKfycbzVSoIyLwVIO8qA0nYH_981tmQXNLDY-aRKAe08x7_4u077ZmUHQ_QDHPYvUKkwxMtT/exec";

const BOOKING_TIME_ZONE = BOOKING_CONFIG.timeZone || "Asia/Kolkata";
const USER_TIME_ZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedBookingTime = null;
let currentRequestId = 0;
let bookingClockTimer = null;

/* =========================================================
   DATE / TIMEZONE HELPERS
   ========================================================= */

/**
 * Treat a date-only value as a calendar date. This avoids the browser
 * interpreting "YYYY-MM-DD" in UTC and accidentally shifting the day.
 */
function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function formatDateKey(year, month, day) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function addDaysToDateKey(dateKey, amount) {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  date.setUTCDate(date.getUTCDate() + amount);

  return formatDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

function getDateKeyForTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = {};
  parts.forEach(function (part) {
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return formatDateKey(values.year, values.month, values.day);
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = {};
  parts.forEach(function (part) {
    if (part.type !== "literal") values[part.type] = part.value;
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

/**
 * Convert a wall-clock date/time in a named timezone to an actual Date.
 * This is used when the API gives us a booking-calendar date plus a time
 * such as 10:30 or 10:30 AM.
 */
function zonedDateTimeToDate(dateKey, timeValue, timeZone) {
  const dateParts = parseDateKey(dateKey);
  if (!dateParts || timeValue == null) return null;

  const raw = String(timeValue).trim();

  // If the API already returns an ISO timestamp with a timezone/offset,
  // use it directly instead of guessing.
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
    const parsedISO = new Date(raw);
    if (!Number.isNaN(parsedISO.getTime())) return parsedISO;
  }

  // Support "HH:mm", "HH:mm:ss", "h:mm AM", "h:mm:ss PM".
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(raw);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  const meridiem = match[4] ? match[4].toUpperCase() : "";

  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  // Start with the requested wall-clock values as if they were UTC,
  // then remove the actual timezone offset. A second pass handles
  // daylight-saving transitions around the selected date.
  let guess = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    hour,
    minute,
    second
  );

  for (let i = 0; i < 3; i += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(
      new Date(guess),
      timeZone
    );
    guess =
      Date.UTC(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        hour,
        minute,
        second
      ) -
      offsetMinutes * 60000;
  }

  return new Date(guess);
}

function formatLocalTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: USER_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function formatLocalDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: USER_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function getTimeZoneLabel(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone,
      timeZoneName: "long"
    }).formatToParts(new Date());

    const zoneNamePart = parts.find(function (part) {
      return part.type === "timeZoneName";
    });

    return zoneNamePart?.value || timeZone;
  } catch (error) {
    return timeZone;
  }
}


function formatClockTime(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date);
}

function formatClockDate(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateKeyForDisplay(dateKey) {
  const parts = parseDateKey(dateKey);
  if (!parts) return "Choose a date";

  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)
  );

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(utcDate);
}

function formatSourceTimeForIndia(dateKey, value) {
  const date = zonedDateTimeToDate(dateKey, value, BOOKING_TIME_ZONE);
  if (!date) return String(value || "");

  return new Intl.DateTimeFormat(undefined, {
    timeZone: BOOKING_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function updateBookingContextClock() {
  const now = new Date();

  const localClock = document.getElementById("local-time-clock");
  if (localClock) localClock.textContent = formatClockTime(now, USER_TIME_ZONE);

  const localZone = document.getElementById("local-time-zone");
  if (localZone) {
    localZone.textContent = getTimeZoneLabel(USER_TIME_ZONE) + " · " + USER_TIME_ZONE;
  }

  const localDate = document.getElementById("local-date-clock");
  if (localDate) localDate.textContent = formatClockDate(now, USER_TIME_ZONE);

  const indiaClock = document.getElementById("india-time-clock");
  if (indiaClock) indiaClock.textContent = formatClockTime(now, BOOKING_TIME_ZONE);

  const indiaDate = document.getElementById("india-date-clock");
  if (indiaDate) indiaDate.textContent = formatClockDate(now, BOOKING_TIME_ZONE);
}

function updateSelectedDateUI(dateKey) {
  const preview = document.getElementById("selected-date-preview");
  const detail = document.getElementById("selected-date-detail");
  const text = dateKey ? formatDateKeyForDisplay(dateKey) : "Choose a date";

  if (preview) preview.textContent = text;
  if (detail) detail.textContent = dateKey ? text : "No date selected";
}

function formatSlotForUser(sourceDate, slot) {
  const startDate = zonedDateTimeToDate(
    sourceDate,
    slot.start,
    BOOKING_TIME_ZONE
  );

  if (!startDate) return null;

  let endDate = zonedDateTimeToDate(
    sourceDate,
    slot.end,
    BOOKING_TIME_ZONE
  );

  if (endDate && endDate.getTime() < startDate.getTime()) {
    endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    sourceDate: sourceDate,
    sourceStart: slot.start,
    sourceEnd: slot.end,
    startDate: startDate,
    endDate: endDate,
    localDate: getDateKeyForTimeZone(startDate, USER_TIME_ZONE),
    localStart: formatLocalTime(startDate),
    localEnd: endDate ? formatLocalTime(endDate) : "",
    available: slot.available === true,
    raw: slot
  };
}

function getVisitorTodayKey() {
  return getDateKeyForTimeZone(new Date(), USER_TIME_ZONE);
}

function updateTimezoneUI() {
  const timezoneLabel = getTimeZoneLabel(USER_TIME_ZONE);

  const timezoneBadge = document.getElementById("booking-timezone");
  if (timezoneBadge) {
    timezoneBadge.textContent =
      "ONLINE CONSULTATION · " + timezoneLabel.toUpperCase();
  }

  const dateHelp = document.getElementById("date-help");
  if (dateHelp) {
    dateHelp.textContent =
      "Available dates are shown in your local time. Time slots automatically adjust to " +
      USER_TIME_ZONE +
      ".";
  }

  const selectedSlot = document.getElementById("selected-slot");
  if (selectedSlot) {
    selectedSlot.dataset.timezone = USER_TIME_ZONE;
  }

  updateSelectedDateUI("");
  updateBookingContextClock();

  if (bookingClockTimer) clearInterval(bookingClockTimer);
  bookingClockTimer = setInterval(updateBookingContextClock, 1000);
}

/* =========================================================
   AVAILABILITY - JSONP (Bypasses Browser CORS)
   ========================================================= */

function getAvailability(date) {
  return new Promise(function (resolve, reject) {
    const callbackName =
      "geoCallback_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 100000);

    const script = document.createElement("script");

    const timeout = setTimeout(function () {
      cleanup();
      reject(new Error("Availability request timed out."));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      if (window[callbackName]) {
        delete window[callbackName];
      }
      if (script.parentNode) {
        script.remove();
      }
    }

    window[callbackName] = function (data) {
      cleanup();
      resolve(data);
    };

    script.onerror = function () {
      cleanup();
      reject(new Error("Google Calendar API connection failed."));
    };

    const url =
      BOOKING_API_URL +
      "?action=availability" +
      "&date=" +
      encodeURIComponent(date) +
      "&callback=" +
      callbackName;

    script.src = url;
    document.body.appendChild(script);
  });
}

/* =========================================================
   LOAD TIME SLOTS
   ========================================================= */

async function loadTimeSlots(localDate) {
  const container = document.getElementById("time-slots");
  if (!container) return;

  const requestId = ++currentRequestId;
  selectedBookingTime = null;

  container.innerHTML = "<p>Loading available times...</p>";
  updateSelectedSlotUI(null);

  // A user's local calendar date can overlap two different dates in IST.
  // Fetch three surrounding booking dates so edge cases near midnight and
  // unusual timezone offsets are covered safely.
  const sourceDates = Array.from(
    new Set([
      addDaysToDateKey(localDate, -1),
      localDate,
      addDaysToDateKey(localDate, 1)
    ].filter(Boolean))
  );

  try {
    // Load the nearby calendar dates one at a time. This keeps the JSONP
    // request compatible with older browsers and avoids firing several
    // cross-origin script requests at once.
    const successfulResults = [];
    const failures = [];

    for (let i = 0; i < sourceDates.length; i += 1) {
      if (requestId !== currentRequestId) return;

      const sourceDate = sourceDates[i];

      try {
        const result = await getAvailability(sourceDate);
        successfulResults.push({
          sourceDate: sourceDate,
          result: result
        });
      } catch (error) {
        failures.push({
          sourceDate: sourceDate,
          reason: error
        });
      }
    }

    if (requestId !== currentRequestId) return;

    if (successfulResults.length === 0) {
      throw failures[0]?.reason || new Error("Unable to load availability.");
    }

    const localSlots = [];

    successfulResults.forEach(function (entry) {
      const result = entry.result;

      if (!result || !result.success) return;

      (result.slots || []).forEach(function (slot) {
        if (slot.available !== true) return;

        const formatted = formatSlotForUser(entry.sourceDate, slot);
        if (!formatted) return;

        // Only show slots that actually fall on the visitor's selected date.
        if (formatted.localDate !== localDate) return;

        localSlots.push(formatted);
      });
    });

    // Remove duplicates, sort by the real instant, then render.
    const uniqueSlots = Array.from(
      new Map(
        localSlots.map(function (slot) {
          return [
            slot.sourceDate +
              "|" +
              String(slot.sourceStart) +
              "|" +
              String(slot.sourceEnd),
            slot
          ];
        })
      ).values()
    );

    uniqueSlots.sort(function (a, b) {
      return a.startDate.getTime() - b.startDate.getTime();
    });

    if (uniqueSlots.length === 0) {
      container.innerHTML =
        "<p>No available consultation times for " +
        escapeHTML(formatDateKeyForMessage(localDate)) +
        " in " +
        escapeHTML(USER_TIME_ZONE) +
        ".</p>";
      return;
    }

    container.innerHTML = "";

    uniqueSlots.forEach(function (slot) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-slot";
      button.textContent =
        slot.localStart +
        (slot.localEnd ? " - " + slot.localEnd : "");
      button.dataset.time = String(slot.sourceStart);
      button.dataset.date = slot.sourceDate;
      button.dataset.timezone = BOOKING_TIME_ZONE;
      button.dataset.localStart = slot.localStart;
      button.dataset.localEnd = slot.localEnd;

      button.setAttribute(
        "aria-label",
        "Select " +
          slot.localStart +
          (slot.localEnd ? " to " + slot.localEnd : "")
      );

      button.addEventListener("click", function () {
        document.querySelectorAll(".time-slot").forEach(function (btn) {
          btn.classList.remove("selected");
        });

        button.classList.add("selected");

        // Preserve the exact API values from the booking calendar.
        selectedBookingTime = {
          date: slot.sourceDate,
          time: slot.sourceStart,
          end: slot.sourceEnd,
          displayStart: slot.localStart,
          displayEnd: slot.localEnd,
          instant: slot.startDate
        };

        updateSelectedSlotUI(selectedBookingTime);
        showMessage("", "");
      });

      container.appendChild(button);
    });

    if (failures.length > 0) {
      console.warn(
        "Some adjacent booking dates could not be loaded.",
        failures.map(function (failure) {
          return failure.reason;
        })
      );
    }
  } catch (error) {
    if (requestId !== currentRequestId) return;

    console.error("Availability error:", error);
    container.innerHTML =
      "<p>Unable to load available times. Please try again.</p>";
  }
}

function formatDateKeyForMessage(dateKey) {
  const parts = parseDateKey(dateKey);
  if (!parts) return dateKey;

  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)
  );

  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(utcDate);
}

function updateSelectedSlotUI(slot) {
  const selected = document.getElementById("selected-slot");
  const bookingCard = document.getElementById("booking-time-card");
  const bookingClock = document.getElementById("booking-time-clock");
  const bookingLocal = document.getElementById("booking-time-local");
  const bookingIndia = document.getElementById("booking-time-india");

  if (!slot) {
    if (selected) {
      selected.innerHTML =
        "<span>SELECTED SLOT</span><strong>No time selected</strong>";
    }
    if (bookingCard) bookingCard.classList.remove("is-selected");
    if (bookingClock) bookingClock.textContent = "No slot selected";
    if (bookingLocal) bookingLocal.textContent = "Choose an available slot below.";
    if (bookingIndia) bookingIndia.textContent = "India: —";
    return;
  }

  const timeText =
    slot.displayStart +
    (slot.displayEnd ? " - " + slot.displayEnd : "");
  const indiaTimeText =
    formatSourceTimeForIndia(slot.sourceDate, slot.sourceStart) +
    (slot.sourceEnd ? " - " + formatSourceTimeForIndia(slot.sourceDate, slot.sourceEnd) : "");

  if (selected) {
    selected.innerHTML =
      "<span>SELECTED SLOT · " +
      escapeHTML(USER_TIME_ZONE) +
      "</span><strong>" +
      escapeHTML(timeText) +
      "</strong>";
  }

  if (bookingCard) bookingCard.classList.add("is-selected");
  if (bookingClock) bookingClock.textContent = timeText;
  if (bookingLocal) bookingLocal.textContent = "Your local time · " + USER_TIME_ZONE;
  if (bookingIndia) bookingIndia.textContent = "India: " + indiaTimeText;
}

/* =========================================================
   SUBMIT BOOKING
   ========================================================= */

async function submitBooking(event) {
  event.preventDefault();

  const dateInput = document.getElementById("booking-date");
  const nameInput = document.getElementById("customer-name");
  const emailInput = document.getElementById("customer-email");
  const phoneInput = document.getElementById("customer-phone");
  const companyInput = document.getElementById("customer-company");
  const serviceInput = document.getElementById("customer-service");
  const detailsInput = document.getElementById("customer-details");
  const submitButton = document.querySelector(
    "#booking-form button[type='submit']"
  );

  if (!dateInput || !dateInput.value) {
    showMessage("Please select a date.", "error");
    return;
  }

  if (!selectedBookingTime) {
    showMessage("Please select an available time slot.", "error");
    return;
  }

  if (!nameInput || !nameInput.value.trim()) {
    showMessage("Please enter your name.", "error");
    return;
  }

  if (!emailInput || !emailInput.value.trim()) {
    showMessage("Please enter your email.", "error");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Submitting Request...";
  }

  showMessage("Submitting your booking request...", "loading");

  /*
   * Keep the API's original date/time values exactly as returned by the
   * booking calendar. The browser-local date/time is presentation only.
   *
   * timezone is extra context for the backend and does not change the
   * existing contract. Existing backend fields remain unchanged.
   */
  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput ? phoneInput.value.trim() : "",
    company: companyInput ? companyInput.value.trim() : "",
    service: serviceInput ? serviceInput.value : "",
    date: selectedBookingTime.date,
    time: selectedBookingTime.time,
    details: detailsInput ? detailsInput.value.trim() : ""
  };

  try {
    const response = await fetch(BOOKING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!result || !result.success) {
      showMessage(
        result?.message || "Booking could not be completed.",
        "error"
      );

      loadTimeSlots(dateInput.value);

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Confirm Booking";
      }
      return;
    }

    // SUCCESS
    showMessage(
      "Request received! Your booking is pending review. You will receive an invitation email once confirmed.",
      "success"
    );

    const bookingForm = document.getElementById("booking-form");
    if (bookingForm) {
      bookingForm.reset();
    }

    selectedBookingTime = null;
    updateSelectedSlotUI(null);
    updateSelectedDateUI(dateInput.value || "");

    document.querySelectorAll(".time-slot").forEach(function (btn) {
      btn.classList.remove("selected");
    });

    loadTimeSlots(dateInput.value);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Confirm Booking";
    }
  } catch (error) {
    console.error("Booking submission error:", error);
    showMessage(
      "Unable to submit booking request. Please check your internet connection and try again.",
      "error"
    );

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Confirm Booking";
    }
  }
}

/* =========================================================
   MESSAGE HELPER
   ========================================================= */

function showMessage(message, type) {
  const messageBox = document.getElementById("booking-message");
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = "booking-message";

  if (type) {
    messageBox.classList.add(type);
  }
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   DATE PICKER INITIALIZATION
   ========================================================= */

function setupBookingDate() {
  const dateInput = document.getElementById("booking-date");
  if (!dateInput) return;

  const todayKey = getVisitorTodayKey();
  dateInput.min = todayKey;

  updateSelectedDateUI(dateInput.value || "");

  dateInput.addEventListener("change", function () {
    selectedBookingTime = null;
    updateSelectedSlotUI(null);
    updateSelectedDateUI(dateInput.value || "");

    if (!dateInput.value) {
      const container = document.getElementById("time-slots");
      if (container) {
        container.innerHTML = "<p>Select a date to see available times.</p>";
      }
      return;
    }

    loadTimeSlots(dateInput.value);
  });
}

/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  updateTimezoneUI();
  setupBookingDate();

  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", submitBooking);
  }
});
