/**
 * =========================================================
 * GeoProcess Consulting - Production Booking Backend
 * =========================================================
 */

const CONFIG = {
  CALENDAR_ID: "primary",
  TIMEZONE: "Asia/Kolkata",
  SLOT_MINUTES: 30,
  START_HOUR: 9,  // 09:00 AM
  END_HOUR: 21,   // 09:00 PM
  WORKING_DAYS: [1, 2, 3, 4, 5, 6], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  // ACTIVE Web App URL
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbwcakUv1XPjz3HGfxyJHRsYDj7BA6jdV0vIUOBmnaYzwa6sRL_g-taxBOmvJIbLi0ON/exec",
};

/* =========================================================
   GET REQUEST (Availability, Approve, Reject)
   ========================================================= */

function doGet(e) {
  try {
    const action = e?.parameter?.action || "";
    const date = e?.parameter?.date || "";
    const callback = e?.parameter?.callback || "";

    // 1. AVAILABILITY (Supports JSONP)
    if (action === "availability") {
      const result = getAvailability(date);
      if (callback) {
        return ContentService
          .createTextOutput(callback + "(" + JSON.stringify(result) + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return jsonResponse(result);
    }

    // 2. APPROVE
    if (action === "approve") {
      const eventId = e?.parameter?.eventId || "";
      const guestEmail = e?.parameter?.email || "";
      const token = e?.parameter?.token || "";

      if (!verifyActionToken("approve", eventId, guestEmail, token)) {
        return htmlResponse(
          "Invalid Approval Link",
          "This approval link is invalid or expired.",
          "error"
        );
      }

      return handleApproval(eventId, guestEmail);
    }

    // 3. REJECT
    if (action === "reject") {
      const eventId = e?.parameter?.eventId || "";
      const guestEmail = e?.parameter?.email || "";
      const guestName = e?.parameter?.name || "";
      const token = e?.parameter?.token || "";

      if (!verifyActionToken("reject", eventId, guestEmail, token)) {
        return htmlResponse(
          "Invalid Rejection Link",
          "This rejection link is invalid or expired.",
          "error"
        );
      }

      return handleRejection(eventId, guestEmail, guestName);
    }

    return htmlResponse(
      "GeoProcess Booking API is Running",
      "The booking system is active and ready.",
      "info"
    );

  } catch (error) {
    const errResult = {
      success: false,
      message: error.message || String(error)
    };

    if (e?.parameter?.callback) {
      return ContentService
        .createTextOutput(e.parameter.callback + "(" + JSON.stringify(errResult) + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return jsonResponse(errResult);
  }
}

/* =========================================================
   POST REQUEST (Create Booking)
   ========================================================= */

function doPost(e) {
  try {
    /*
     * CONTACT:
     * The browser submits a normal form into a hidden iframe.
     * This avoids exposing the Web3Forms key in client-side JS
     * and avoids requiring browser CORS access to Apps Script.
     */
    const action = e?.parameter?.action || "";

    if (action === "contact") {
      const result = handleContactSubmission(e);
      return contactResultHtml(
        result.success,
        result.message,
        e?.parameter?.request_id || ""
      );
    }

    /* BOOKING:
     * Preserve the existing JSON booking API.
     */
    let data;

    if (e?.postData?.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e?.parameter || {};
    }

    if (!data || Object.keys(data).length === 0) {
      throw new Error("No booking data received.");
    }

    const result = createBooking(data);
    return jsonResponse(result);

  } catch (error) {
    const message = error.message || String(error);

    if (e?.parameter?.action === "contact") {
      return contactResultHtml(
        false,
        "Your enquiry could not be submitted. Please try again or contact us directly.",
        e?.parameter?.request_id || ""
      );
    }

    return jsonResponse({
      success: false,
      message: message
    });
  }
}


/* =========================================================
   CONTACT — SECURE WEB3FORMS PROXY
   ========================================================= */

function handleContactSubmission(e) {
  const accessKey = getRequiredScriptProperty("WEB3FORMS_ACCESS_KEY");

  const payload = {
    access_key: accessKey,
    subject: e?.parameter?.subject || "New GeoProcess Consulting Project Enquiry",
    from_name: e?.parameter?.from_name || "GeoProcess Consulting Website",
    name: e?.parameter?.name || "",
    email: e?.parameter?.email || "",
    company: e?.parameter?.company || "",
    service: e?.parameter?.service || "",
    scope: e?.parameter?.scope || "",
    deliverable: e?.parameter?.deliverable || "",
    message: e?.parameter?.message || ""
  };

  if (!payload.name || !payload.email) {
    return {
      success: false,
      message: "Please provide your name and email address."
    };
  }

  const response = UrlFetchApp.fetch(
    "https://api.web3forms.com/submit",
    {
      method: "post",
      payload: payload,
      muteHttpExceptions: true
    }
  );

  const statusCode = response.getResponseCode();
  const text = response.getContentText();

  let result = null;
  try {
    result = JSON.parse(text);
  } catch (err) {
    result = null;
  }

  if (
    statusCode >= 200 &&
    statusCode < 300 &&
    result &&
    result.success === true
  ) {
    return {
      success: true,
      message: "Your enquiry was submitted successfully. We will get back to you soon."
    };
  }

  console.error(
    "Web3Forms error: HTTP " +
      statusCode +
      " — " +
      text.substring(0, 500)
  );

  return {
    success: false,
    message: "Your enquiry could not be submitted. Please try again or contact us directly."
  };
}

function contactResultHtml(success, message, requestId) {
  const payload = {
    type: "geoprocess-contact-result",
    success: success === true,
    message: String(message || ""),
    requestId: String(requestId || "")
  };

  const json = JSON.stringify(payload).replace(/</g, "\\u003c");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>GeoProcess Contact</title>
      </head>
      <body>
        <script>
          (function () {
            const result = ${json};
            if (window.parent && window.parent !== window) {
              window.parent.postMessage(result, "*");
            }
          })();
        </script>
      </body>
    </html>
  `;

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* =========================================================
   PRIVATE SCRIPT PROPERTIES
   ========================================================= */

function getRequiredScriptProperty(name) {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(name);

  if (!value) {
    throw new Error("Required Script Property is missing: " + name);
  }

  return value;
}

function getBookingSecretKey() {
  return getRequiredScriptProperty("BOOKING_SECRET_KEY");
}

/* =========================================================
   AVAILABILITY
   ========================================================= */

function getAvailability(dateString) {
  if (!dateString) {
    return { success: false, message: "Date is required." };
  }

  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return { success: false, message: "Invalid date format. Use YYYY-MM-DD." };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const checkDate = new Date(year, month, day);
  if (isNaN(checkDate.getTime())) {
    return { success: false, message: "Invalid date." };
  }

  // Working day check (0 is Sunday, 1 is Monday ... 6 is Saturday)
  const dayOfWeek = checkDate.getDay();
  if (!CONFIG.WORKING_DAYS.includes(dayOfWeek)) {
    return {
      success: true,
      date: dateString,
      slots: [],
      message: "Consultations are not available on Sundays."
    };
  }

  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!calendar) {
    return { success: false, message: "Google Calendar not found." };
  }

  const slots = [];
  const now = new Date();

  for (
    let minutes = CONFIG.START_HOUR * 60;
    minutes < CONFIG.END_HOUR * 60;
    minutes += CONFIG.SLOT_MINUTES
  ) {
    const hour = Math.floor(minutes / 60);
    const min = minutes % 60;

    const start = new Date(year, month, day, hour, min, 0, 0);
    const end = new Date(start.getTime() + CONFIG.SLOT_MINUTES * 60 * 1000);

    // Filter out past times for today
    if (start <= now) {
      continue;
    }

    const events = calendar.getEvents(start, end);
    const busy = events.some(function (event) {
      if (event.isAllDayEvent()) return true;
      return start < event.getEndTime() && end > event.getStartTime();
    });

    if (!busy) {
      slots.push({
        start: formatTime(start),
        end: formatTime(end),
        available: true
      });
    }
  }

  return {
    success: true,
    date: dateString,
    slots: slots
  };
}

/* =========================================================
   CREATE PENDING BOOKING
   ========================================================= */

function createBooking(data) {
  if (!data.name || !data.email || !data.date || !data.time) {
    return {
      success: false,
      message: "Missing required booking details."
    };
  }

  const start = parseBookingTime(data.date, data.time);
  if (!start) {
    return {
      success: false,
      message: "Invalid booking date or time."
    };
  }

  const end = new Date(start.getTime() + CONFIG.SLOT_MINUTES * 60 * 1000);

  const dayOfWeek = start.getDay();
  if (!CONFIG.WORKING_DAYS.includes(dayOfWeek)) {
    return {
      success: false,
      message: "Bookings are not available on Sundays."
    };
  }

  const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    return {
      success: false,
      message: "System is busy processing another request. Please try again."
    };
  }

  try {
    const existingEvents = calendar.getEvents(start, end);
    const conflict = existingEvents.some(function (event) {
      if (event.isAllDayEvent()) return true;
      return start < event.getEndTime() && end > event.getStartTime();
    });

    if (conflict) {
      return {
        success: false,
        message: "Sorry, this slot was just reserved. Please select another time."
      };
    }

    // Create [PENDING] event in Google Calendar
    const eventTitle = "[PENDING] GeoProcess Consultation - " + data.name;
    const description =
      "GeoProcess Consulting Consultation\n\n" +
      "Status: PENDING ADMIN APPROVAL\n\n" +
      "Customer: " + data.name + "\n" +
      "Email: " + data.email + "\n" +
      "Phone: " + (data.phone || "N/A") + "\n" +
      "Company: " + (data.company || "N/A") + "\n" +
      "Service: " + (data.service || "N/A") + "\n\n" +
      "Project Details:\n" + (data.details || "N/A");

    const event = calendar.createEvent(eventTitle, start, end, {
      description: description,
      sendInvites: false
    });

    // Send Approval Email to Admin
    sendAdminApprovalEmail({
      eventId: event.getId(),
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      service: data.service,
      details: data.details,
      date: data.date,
      time: data.time
    });

    return {
      success: true,
      message: "Booking request received! Your request is pending confirmation.",
      eventId: event.getId(),
      date: data.date,
      time: data.time
    };

  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   ADMIN APPROVAL EMAIL
   ========================================================= */

function sendAdminApprovalEmail(booking) {
  const approveToken = generateActionToken("approve", booking.eventId, booking.email);
  const rejectToken = generateActionToken("reject", booking.eventId, booking.email);

  const approveUrl =
    CONFIG.WEB_APP_URL +
    "?action=approve" +
    "&eventId=" + encodeURIComponent(booking.eventId) +
    "&email=" + encodeURIComponent(booking.email) +
    "&token=" + encodeURIComponent(approveToken);

  const rejectUrl =
    CONFIG.WEB_APP_URL +
    "?action=reject" +
    "&eventId=" + encodeURIComponent(booking.eventId) +
    "&email=" + encodeURIComponent(booking.email) +
    "&name=" + encodeURIComponent(booking.name) +
    "&token=" + encodeURIComponent(rejectToken);

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
      <h2 style="color:#0284c7;margin-top:0;">New Booking Pending Confirmation</h2>
      <p>A new consultation request has been received from your website.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">

      <p><strong>Customer:</strong> ${escapeHtml(booking.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(booking.phone || "N/A")}</p>
      <p><strong>Company:</strong> ${escapeHtml(booking.company || "N/A")}</p>
      <p><strong>Service:</strong> ${escapeHtml(booking.service || "N/A")}</p>
      <p><strong>Date:</strong> ${escapeHtml(booking.date)}</p>
      <p><strong>Time:</strong> ${escapeHtml(booking.time)}</p>
      <p><strong>Project Details:</strong><br>${escapeHtml(booking.details || "N/A")}</p>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">

      <div style="margin-top:25px;">
        <a href="${approveUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#16a34a;color:white;text-decoration:none;border-radius:6px;font-weight:bold;margin-right:12px;">
          Approve &amp; Send Invite
        </a>
        <a href="${rejectUrl}" target="_blank" style="display:inline-block;padding:12px 24px;background:#dc2626;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
          Reject &amp; Free Slot
        </a>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: getRequiredScriptProperty("ADMIN_EMAIL"),
    subject: "[Approval Required] Booking Request - " + booking.name,
    htmlBody: htmlBody
  });
}

/* =========================================================
   APPROVE BOOKING
   ========================================================= */

function handleApproval(eventId, guestEmail) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return htmlResponse("Server Busy", "Please refresh in a moment.", "error");
  }

  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const event = calendar.getEventById(eventId);

    if (!event) {
      return htmlResponse("Booking Not Found", "Calendar event was not found.", "error");
    }

    if (!event.getTitle().startsWith("[PENDING]")) {
      return htmlResponse("Already Processed", "This booking has already been confirmed.", "info");
    }

    const newTitle = event.getTitle().replace("[PENDING] ", "");
    event.setTitle(newTitle);

    const oldDescription = event.getDescription();
    event.setDescription(
      oldDescription.replace("Status: PENDING ADMIN APPROVAL", "Status: CONFIRMED")
    );

    // Add customer to Google Calendar
    event.addGuest(guestEmail);

    // Send Confirmation Email to Customer
    const eventDate = Utilities.formatDate(event.getStartTime(), CONFIG.TIMEZONE, "EEEE, MMMM dd, yyyy");
    const eventStartTime = Utilities.formatDate(event.getStartTime(), CONFIG.TIMEZONE, "hh:mm a");
    const eventEndTime = Utilities.formatDate(event.getEndTime(), CONFIG.TIMEZONE, "hh:mm a");

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
        <h2 style="color:#0284c7;margin-top:0;">Your Consultation is Confirmed!</h2>
        <p>Hello,</p>
        <p>Your appointment with <strong>GeoProcess Consulting</strong> has been officially confirmed.</p>
        <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:20px 0;border-left:4px solid #0284c7;">
          <p style="margin:4px 0;"><strong>Date:</strong> ${eventDate}</p>
          <p style="margin:4px 0;"><strong>Time:</strong> ${eventStartTime} - ${eventEndTime} (IST)</p>
          <p style="margin:4px 0;"><strong>Topic:</strong> ${escapeHtml(newTitle)}</p>
        </div>
        <p>A Google Calendar invitation has been sent to your email.</p>
        <p style="margin-top:24px;">Best regards,<br><strong>GeoProcess Consulting</strong></p>
      </div>
    `;

    MailApp.sendEmail({
      to: guestEmail,
      subject: "Confirmed: GeoProcess Consulting Appointment",
      htmlBody: customerHtml
    });

    return htmlResponse(
      "Booking Approved Successfully",
      "The booking is confirmed. The customer has been added to Google Calendar and an invitation email has been sent.",
      "success"
    );

  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   REJECT BOOKING
   ========================================================= */

function handleRejection(eventId, guestEmail, guestName) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return htmlResponse("Server Busy", "Please refresh in a moment.", "error");
  }

  try {
    const calendar = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
    const event = calendar.getEventById(eventId);

    if (event) {
      event.deleteEvent();
    }

    if (guestEmail) {
      const rejectHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:10px;">
          <h2 style="color:#e11d48;margin-top:0;">Consultation Request Update</h2>
          <p>Dear ${escapeHtml(guestName || "Customer")},</p>
          <p>Thank you for contacting <strong>GeoProcess Consulting</strong>.</p>
          <p>Unfortunately, we are unable to accept your requested consultation time due to a scheduling conflict.</p>
          <p>Please visit our booking page to select another available slot.</p>
          <p style="margin-top:24px;">Best regards,<br><strong>GeoProcess Consulting</strong></p>
        </div>
      `;

      MailApp.sendEmail({
        to: guestEmail,
        subject: "Consultation Request Update - GeoProcess Consulting",
        htmlBody: rejectHtml
      });
    }

    return htmlResponse(
      "Booking Rejected & Slot Released",
      "The slot has been released and is available again on your website. A notification was sent to the customer.",
      "success"
    );

  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   SECURITY & TOKEN VERIFICATION
   ========================================================= */

function generateActionToken(action, eventId, email) {
  const payload = action + "|" + eventId + "|" + email;
  const signature = Utilities.computeHmacSha256Signature(payload, getBookingSecretKey());
  return signature.map(function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");
}

function verifyActionToken(action, eventId, email, token) {
  if (!token || !eventId || !email) return false;
  const expected = generateActionToken(action, eventId, email).toLowerCase();
  const provided = String(token).toLowerCase();
  if (expected.length !== provided.length) return false;

  let match = 0;
  for (let i = 0; i < expected.length; i++) {
    match |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return match === 0;
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatTime(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "hh:mm a");
}

function parseBookingTime(dateString, timeString) {
  if (!dateString || !timeString) return null;

  const parts = dateString.split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const startTime = timeString.split("-")[0].trim();
  const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return new Date(year, month, day, hour, minute, 0, 0);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse(title, message, type) {
  const isSuccess = type === "success";
  const isInfo = type === "info";
  const color = isSuccess ? "#16a34a" : isInfo ? "#0284c7" : "#dc2626";
  const icon = isSuccess ? "&#10004;" : isInfo ? "&#8505;" : "&#10008;";

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>GeoProcess Consulting</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-width: 500px; width: 100%; text-align: center; border: 1px solid #e2e8f0; }
          .icon { width: 64px; height: 64px; border-radius: 50%; background: ${color}15; color: ${color}; font-size: 32px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
          h2 { color: #0f172a; margin: 0 0 12px 0; font-size: 22px; }
          p { color: #64748b; line-height: 1.6; margin: 0 0 24px 0; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${icon}</div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
          <div class="footer">GeoProcess Consulting Booking System</div>
        </div>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html);
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}