(function () {
  "use strict";

  var CENTER_LO = 38;
  var CENTER_HI = 62;

  function parsePct(el, attr, fallback) {
    var v = parseInt(el.getAttribute(attr), 10);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : fallback;
  }

  /** Meters: animate when cards scroll into view */
  function initMeters() {
    var cards = document.querySelectorAll("[data-meter]");
    if (!cards.length || !("IntersectionObserver" in window)) {
      cards.forEach(function (card) {
        animateCardMeters(card);
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var card = entry.target;
          animateCardMeters(card);
          card.classList.add("is-visible");
          io.unobserve(card);
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );

    cards.forEach(function (card) {
      io.observe(card);
    });
  }

  function animateCardMeters(card) {
    var hypeTarget = parsePct(card, "data-hype", 72);
    var ledgerTarget = parsePct(card, "data-ledger", 45);
    var hypeVal = card.querySelector("[data-meter-hype]");
    var ledgerVal = card.querySelector("[data-meter-ledger]");
    var hypeBar = card.querySelector("[data-meter-hype-bar]");
    var ledgerBar = card.querySelector("[data-meter-ledger-bar]");

    requestAnimationFrame(function () {
      if (hypeBar) hypeBar.style.width = hypeTarget + "%";
      if (ledgerBar) ledgerBar.style.width = ledgerTarget + "%";
      if (hypeVal) hypeVal.textContent = hypeTarget + "%";
      if (ledgerVal) ledgerVal.textContent = ledgerTarget + "%";
    });
  }

  /** Spectrum: slider + tabs */
  function initSpectrum() {
    var range = document.getElementById("spectrum-range");
    var hint = document.getElementById("spectrum-hint");
    var scrim = document.querySelector("[data-briefing-scrim]");
    var tabAlarm = document.getElementById("tab-alarm");
    var tabBriefing = document.getElementById("tab-briefing");
    var tabAssurance = document.getElementById("tab-assurance");
    var panelAlarm = document.getElementById("panel-alarm");
    var panelAssurance = document.getElementById("panel-assurance");
    var panelBriefing = document.getElementById("spectrum-panel");
    var tabs = document.querySelectorAll(".tabs__btn[data-tab]");

    if (!range || !scrim || !panelAlarm || !panelAssurance || !panelBriefing) return;

    function setAriaRange(val) {
      var inCenter = val >= CENTER_LO && val <= CENTER_HI;
      range.setAttribute("aria-valuenow", String(val));
      if (inCenter) {
        range.setAttribute("aria-valuetext", "Center: briefing unlocked");
      } else if (val < CENTER_LO) {
        range.setAttribute("aria-valuetext", "Toward alarm narrative");
      } else {
        range.setAttribute("aria-valuetext", "Toward assurance narrative");
      }
    }

    function showMode(mode) {
      var isAlarm = mode === "alarm";
      var isAssurance = mode === "assurance";
      var isBriefing = mode === "briefing";

      panelAlarm.hidden = !isAlarm;
      panelAssurance.hidden = !isAssurance;
      panelBriefing.hidden = !isBriefing;

      if (panelBriefing.classList) {
        panelBriefing.classList.toggle("panel--briefing-active", isBriefing);
      }

      tabs.forEach(function (btn) {
        var t = btn.getAttribute("data-tab");
        var sel = t === mode;
        btn.setAttribute("aria-selected", sel ? "true" : "false");
        btn.tabIndex = sel ? 0 : -1;
      });

      if (hint) {
        hint.textContent = isBriefing
          ? "Briefing open. Drag toward Alarm or Assurance to see the two loud takes side by side."
          : isAlarm
            ? "Alarm side showing. Slide toward the middle—or tap Briefing—for the calmer read."
            : "Assurance side showing. Slide toward the middle—or tap Briefing—for the calmer read.";
      }

      if (isBriefing) {
        scrim.classList.remove("is-locked");
      } else {
        scrim.classList.add("is-locked");
      }
    }

    function valueToMode(val) {
      if (val >= CENTER_LO && val <= CENTER_HI) return "briefing";
      if (val < CENTER_LO) return "alarm";
      return "assurance";
    }

    function modeToValue(mode) {
      if (mode === "alarm") return 12;
      if (mode === "assurance") return 88;
      return 50;
    }

    function onInput() {
      var val = Number(range.value);
      setAriaRange(val);
      showMode(valueToMode(val));
    }

    range.addEventListener("input", onInput);
    range.addEventListener("change", onInput);

    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var mode = btn.getAttribute("data-tab");
        if (!mode) return;
        range.value = String(modeToValue(mode));
        setAriaRange(Number(range.value));
        showMode(mode);
      });
    });

    /** Keyboard: left/right on tablist when focused */
    var tablist = document.querySelector(".tabs[role='tablist']");
    if (tablist) {
      tablist.addEventListener("keydown", function (e) {
        var order = [tabAlarm, tabBriefing, tabAssurance];
        var focusIndex = order.indexOf(document.activeElement);
        if (focusIndex < 0) return;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          var next =
            e.key === "ArrowRight"
              ? (focusIndex + 1) % order.length
              : (focusIndex - 1 + order.length) % order.length;
          order[next].focus();
          order[next].click();
        }
      });
    }

    setAriaRange(Number(range.value));
    onInput();

    document.querySelectorAll(".skip-link").forEach(function (link) {
      link.addEventListener("click", function () {
        range.value = "50";
        setAriaRange(50);
        showMode("briefing");
        tabBriefing.focus();
      });
    });
  }

  function initSidebarSearch() {
    var input = document.getElementById("sidebar-search");
    if (!input) return;
    var items = document.querySelectorAll(".sidebar__item[data-search-blob]");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (el) {
        var blob = (el.getAttribute("data-search-blob") || "").toLowerCase();
        var match = q === "" || blob.indexOf(q) !== -1;
        el.style.display = match ? "" : "none";
      });
    });
  }

  initMeters();
  initSpectrum();
  initSidebarSearch();
})();
