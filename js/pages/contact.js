document.addEventListener("DOMContentLoaded", function () {

  const form =
    document.getElementById("contact-form");

  const status =
    document.getElementById("enquiryStatus");

  if (!form || !status) return;

  let submitting = false;
  let requestId = "";
  let timeoutId = null;


  function showStatus(message, type) {

    status.style.display = "block";
    status.textContent = message;

    if (type === "success") {

      status.style.background = "#eef9f0";
      status.style.border = "1px solid #bce3c2";
      status.style.color = "#235f2d";

    } else {

      status.style.background = "#fff1f1";
      status.style.border = "1px solid #f0b8b8";
      status.style.color = "#9b2c2c";
    }
  }


  function resetButton() {

    const button =
      form.querySelector(
        'button[type="submit"]'
      );

    if (button) {

      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent =
        "Send Project Enquiry →";
    }

    submitting = false;
  }


  /* -------------------------------------------------------
     CREATE RESPONSE IFRAME
     ------------------------------------------------------- */

  const frameName =
    "geoprocess_contact_frame_" +
    Date.now() +
    "_" +
    Math.floor(
      Math.random() * 100000
    );


  const iframe =
    document.createElement("iframe");

  iframe.name = frameName;
  iframe.title = "Contact response";
  iframe.setAttribute(
    "aria-hidden",
    "true"
  );

  iframe.style.position = "absolute";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";

  document.body.appendChild(iframe);

  form.target = frameName;


  /* -------------------------------------------------------
     LISTEN FOR APPS SCRIPT RESPONSE
     ------------------------------------------------------- */

  window.addEventListener(
    "message",
    function (event) {

      const data = event.data;

      if (
        !data ||
        data.type !==
          "geoprocess-contact-result"
      ) {
        return;
      }


      if (
        requestId &&
        data.requestId &&
        data.requestId !== requestId
      ) {
        return;
      }


      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }


      if (data.success === true) {

        showStatus(
          "✓ Your enquiry was submitted successfully. We will get back to you soon.",
          "success"
        );

        form.reset();

      } else {

        showStatus(
          "✕ Your enquiry could not be submitted. Please try again or contact us directly.",
          "error"
        );
      }


      resetButton();
    }
  );


  /* -------------------------------------------------------
     FORM SUBMISSION
     ------------------------------------------------------- */

  form.addEventListener(
    "submit",
    function () {

      if (submitting) {
        return;
      }


      submitting = true;


      requestId =
        "contact_" +
        Date.now() +
        "_" +
        Math.floor(
          Math.random() * 1000000
        );


      const requestField =
        document.getElementById(
          "contact-request-id"
        );


      if (requestField) {
        requestField.value =
          requestId;
      }


      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );


      if (submitButton) {

        submitButton.disabled = true;

        submitButton.setAttribute(
          "aria-busy",
          "true"
        );

        submitButton.textContent =
          "Sending…";
      }


      status.style.display = "none";
      status.textContent = "";


      /*
       * Safety timeout.
       *
       * The page must never remain stuck
       * on "Sending…" forever.
       */

      timeoutId =
        setTimeout(
          function () {

            if (!submitting) return;

            showStatus(
              "✕ We could not confirm the submission. Please try again.",
              "error"
            );

            resetButton();

          },
          20000
        );
    }
  );


  /* -------------------------------------------------------
     EMAIL DROPDOWN
     ------------------------------------------------------- */

  const launcher =
    document.querySelector(
      ".email-launcher"
    );

  if (!launcher) return;


  const toggle =
    launcher.querySelector(
      ".email-menu-button"
    );

  if (!toggle) return;


  const email =
    "contact@geoprocessconsulting.site";

  const subject =
    "Project Enquiry - GeoProcess Consulting";

  const body =
    "Hello GeoProcess Consulting,\n\n" +
    "I would like to discuss a project with your team.\n\n" +
    "Project details:\n";


  function closeEmailMenu() {

    launcher.classList.remove(
      "open"
    );

    toggle.setAttribute(
      "aria-expanded",
      "false"
    );
  }


  function openEmailClient(client) {

    const enc =
      encodeURIComponent;


    if (client === "gmail") {

      const url =
        "https://mail.google.com/mail/?" +
        "view=cm&fs=1" +
        "&to=" + enc(email) +
        "&su=" + enc(subject) +
        "&body=" + enc(body);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    } else if (client === "outlook") {

      const url =
        "https://outlook.office.com/mail/deeplink/compose?" +
        "to=" + enc(email) +
        "&subject=" + enc(subject) +
        "&body=" + enc(body);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    } else {

      window.location.href =
        "mailto:" +
        email +
        "?subject=" +
        enc(subject) +
        "&body=" +
        enc(body);
    }


    closeEmailMenu();
  }


  toggle.addEventListener(
    "click",
    function (event) {

      event.preventDefault();
      event.stopPropagation();

      const open =
        launcher.classList.contains(
          "open"
        );

      if (open) {
        closeEmailMenu();
      } else {

        launcher.classList.add(
          "open"
        );

        toggle.setAttribute(
          "aria-expanded",
          "true"
        );
      }
    }
  );


  launcher
    .querySelectorAll(
      "[data-email-client]"
    )
    .forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();
            event.stopPropagation();

            openEmailClient(
              button.dataset.emailClient
            );
          }
        );
      }
    );


  document.addEventListener(
    "click",
    function (event) {

      if (
        !launcher.contains(
          event.target
        )
      ) {
        closeEmailMenu();
      }
    }
  );


  document.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Escape") {
        closeEmailMenu();
      }
    }
  );

});