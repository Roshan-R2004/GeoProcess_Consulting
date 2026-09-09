/* =========================================================
   GeoProcess Consulting - Booking Frontend
   ========================================================= */

/*
 * IMPORTANT:
 * Replace this with your ACTIVE Google Apps Script /exec URL.
 */
const BOOKING_API_URL = window.GEOPROCESS_BOOKING?.apiUrl || "https://script.google.com/macros/s/AKfycbzsMxwMMyOey_Nqe783GViWusNQU1U-hLY2CEDYPsbEEEFqXhFd9mJikizDLIp1z5nk/exec"
/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedBookingTime = null;
let currentRequestId = 0;

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
  setupBookingDate();

  const form = document.getElementById("booking-form");
  if (form) {
    form.addEventListener("submit", submitBooking);
  }
});