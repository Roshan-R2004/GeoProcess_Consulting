/* =========================================================
   GeoProcess Consulting - Booking Frontend
   ========================================================= */

/*
 * IMPORTANT:
 * Replace this with your ACTIVE Google Apps Script /exec URL.
 */
const BOOKING_API_URL = window.GEOPROCESS_BOOKING?.apiUrl || "https://script.google.com/macros/s/AKfycbzVSoIyLwVIO8qA0nYH_981tmQXNLDY-aRKAe08x7_4u077ZmUHQ_QDHPYvUKkwxMtT/exec"
/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedBookingTime = null;
let currentRequestId = 0;
let selectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
let selectedSlotMeta = null;

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
      "&timezone=" +
      encodeURIComponent(selectedTimeZone) +
      "&callback=" +
      callbackName;

    script.src = url;
    document.body.appendChild(script);
  });
}

/* =========================================================
   LOAD TIME SLOTS
   ========================================================= */

async function loadTimeSlots(date) {
  const container = document.getElementById("time-slots");
  if (!container) return;

  const requestId = ++currentRequestId;
  selectedBookingTime = null;

  container.innerHTML = "<p>Loading available times...</p>";

  try {
    const result = await getAvailability(date);

    if (requestId !== currentRequestId) return;

    if (!result || !result.success) {
      container.innerHTML =
        "<p>" +
        escapeHTML(result?.message || "Unable to load available times.") +
        "</p>";
      return;
    }

    const availableSlots = (result.slots || []).filter(function (slot) {
      return slot.available === true;
    });

    if (availableSlots.length === 0) {
      container.innerHTML =
        "<p>" +
        escapeHTML(result.message || "No available times for this date.") +
        "</p>";
      return;
    }

    container.innerHTML = "";

    availableSlots.forEach(function (slot) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "time-slot";
      button.textContent = slot.start + " - " + slot.end;
      button.dataset.time = slot.start;

      button.addEventListener("click", function () {
        document.querySelectorAll(".time-slot").forEach(function (btn) {
          btn.classList.remove("selected");
        });

        button.classList.add("selected");
        selectedBookingTime = slot.start;
        selectedSlotMeta = slot;
        updateSelectedSlotDisplay(slot);
        showMessage("", "");
      });

      container.appendChild(button);
    });
  } catch (error) {
    if (requestId !== currentRequestId) return;
    console.error("Availability error:", error);
    container.innerHTML =
      "<p>Unable to load available times. Please try again.</p>";
  }
}

/* =========================================================
   SUBMIT BOOKING (CORS-Safe Async Fetch)
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

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    phone: phoneInput ? phoneInput.value.trim() : "",
    company: companyInput ? companyInput.value.trim() : "",
    service: serviceInput ? serviceInput.value : "",
    date: dateInput.value,
    time: selectedBookingTime,
    timezone: selectedTimeZone,
    localDate: dateInput.value,
    localTime: selectedBookingTime,
    businessDate: selectedSlotMeta?.businessDate || dateInput.value,
    businessTime: selectedSlotMeta?.businessTime || selectedBookingTime,
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
    selectedSlotMeta = null;
    updateSelectedSlotDisplay(null);

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
   TIME ZONE
   ========================================================= */

function getSupportedTimeZones() {
  // Keep this list intentionally small and stable. Every timezone below is
  // supported by the booking backend and is a practical choice for visitors.
  return [
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Kathmandu",
    "Asia/Dubai",
    "Asia/Riyadh",
    "Asia/Jerusalem",
    "Europe/London",
    "Europe/Amsterdam",
    "Europe/Berlin",
    "Europe/Paris",
    "Europe/Moscow",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "America/Toronto",
    "America/Vancouver",
    "America/Mexico_City",
    "America/Sao_Paulo",
    "America/Argentina/Buenos_Aires",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Africa/Nairobi",
    "Africa/Lagos",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Bangkok",
    "Asia/Jakarta",
    "Australia/Perth",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Pacific/Auckland",
    "UTC"
  ];
}

function getTimeZoneGroups() {
  return [
    {
      label: "India & South Asia",
      zones: ["Asia/Kolkata", "Asia/Dhaka", "Asia/Kathmandu"]
    },
    {
      label: "Middle East",
      zones: ["Asia/Dubai", "Asia/Riyadh", "Asia/Jerusalem"]
    },
    {
      label: "Europe",
      zones: ["Europe/London", "Europe/Amsterdam", "Europe/Berlin", "Europe/Paris", "Europe/Moscow"]
    },
    {
      label: "USA",
      zones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"]
    },
    {
      label: "Canada",
      zones: ["America/Toronto", "America/Vancouver"]
    },
    {
      label: "Latin America",
      zones: ["America/Mexico_City", "America/Sao_Paulo", "America/Argentina/Buenos_Aires"]
    },
    {
      label: "Africa",
      zones: ["Africa/Cairo", "Africa/Johannesburg", "Africa/Nairobi", "Africa/Lagos"]
    },
    {
      label: "Asia-Pacific",
      zones: ["Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Asia/Seoul", "Asia/Bangkok", "Asia/Jakarta"]
    },
    {
      label: "Australia & New Zealand",
      zones: ["Australia/Perth", "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland"]
    },
    {
      label: "Other",
      zones: ["UTC"]
    }
  ];
}

function mapBrowserTimeZoneToSupported(zone) {
  const zones = getSupportedTimeZones();
  if (zones.includes(zone)) return zone;

  // Common browser timezone names mapped to the closest curated option.
  const aliases = {
    "Europe/Brussels": "Europe/Amsterdam",
    "Europe/Copenhagen": "Europe/Berlin",
    "Europe/Oslo": "Europe/Berlin",
    "Europe/Stockholm": "Europe/Berlin",
    "Europe/Zurich": "Europe/Berlin",
    "Europe/Rome": "Europe/Paris",
    "Europe/Madrid": "Europe/Paris",
    "Europe/Lisbon": "Europe/London",
    "America/Detroit": "America/New_York",
    "America/Indiana/Indianapolis": "America/New_York",
    "America/Kentucky/Louisville": "America/New_York",
    "America/Phoenix": "America/Denver",
    "America/Edmonton": "America/Denver",
    "America/Winnipeg": "America/Chicago",
    "America/Halifax": "America/New_York",
    "America/St_Johns": "America/New_York",
    "Asia/Muscat": "Asia/Dubai",
    "Asia/Qatar": "Asia/Riyadh",
    "Asia/Kuwait": "Asia/Riyadh",
    "Asia/Bahrain": "Asia/Riyadh",
    "Asia/Aden": "Asia/Riyadh",
    "Asia/Calcutta": "Asia/Kolkata",
    "Asia/Colombo": "Asia/Kolkata",
    "Asia/Rangoon": "Asia/Bangkok",
    "Asia/Ho_Chi_Minh": "Asia/Bangkok",
    "Australia/Brisbane": "Australia/Sydney",
    "Australia/Hobart": "Australia/Sydney",
    "Australia/Adelaide": "Australia/Melbourne",
    "Pacific/Fiji": "Pacific/Auckland"
  };

  return aliases[zone] || "Asia/Kolkata";
}

function timeZoneLabel(timeZone) {
  try {
    const now = new Date();
    const short = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone,
      timeZoneName: "short"
    }).formatToParts(now).find(function (part) { return part.type === "timeZoneName"; });
    return timeZone.replace(/_/g, " ").replace(/\//g, " / ") + (short?.value ? " (" + short.value + ")" : "");
  } catch (error) {
    return timeZone.replace(/_/g, " ").replace(/\//g, " / ");
  }
}

function setupTimeZone() {
  const select = document.getElementById("booking-timezone");
  if (!select) return;

  const zones = getSupportedTimeZones();
  const groups = getTimeZoneGroups();
  selectedTimeZone = mapBrowserTimeZoneToSupported(selectedTimeZone);

  select.innerHTML = "";

  groups.forEach(function (group) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;

    group.zones.forEach(function (zone) {
      const option = document.createElement("option");
      option.value = zone;
      option.textContent = timeZoneLabel(zone);
      optgroup.appendChild(option);
    });

    select.appendChild(optgroup);
  });

  if (!zones.includes(selectedTimeZone)) {
    selectedTimeZone = "Asia/Kolkata";
  }

  select.value = selectedTimeZone;

  select.addEventListener("change", function () {
    selectedTimeZone = select.value;
    selectedBookingTime = null;
    selectedSlotMeta = null;
    updateSelectedSlotDisplay(null);

    const dateInput = document.getElementById("booking-date");
    if (dateInput && dateInput.value) {
      loadTimeSlots(dateInput.value);
    } else {
      const container = document.getElementById("time-slots");
      if (container) container.innerHTML = "<p>Select a date to see available times.</p>";
    }
  });
}

function updateSelectedSlotDisplay(slot) {
  const selected = document.getElementById("selected-slot");
  if (!selected) return;

  const strong = selected.querySelector("strong");
  if (!strong) return;

  if (!slot) {
    strong.textContent = "No time selected";
    return;
  }

  strong.textContent = slot.start + " - " + slot.end + " (" + selectedTimeZone + ")";
}

/* =========================================================
   DATE PICKER INITIALIZATION
   ========================================================= */

function setupBookingDate() {
  const dateInput = document.getElementById("booking-date");
  if (!dateInput) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  dateInput.min = year + "-" + month + "-" + day;

  dateInput.addEventListener("change", function () {
    selectedBookingTime = null;

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
  setupTimeZone();
  setupBookingDate();

  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", submitBooking);
  }
});