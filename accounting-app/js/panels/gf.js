import { escapeHtml, escapeHtmlAttr, showAppToast, showInlineConfirm, formatDate } from '../ui-helpers.js';
import { centsToDollars } from '../ledger-pure.js';

export function createGfPanel(deps) {
  const { gfApi } = deps;
  // --- Gluten-free medical expense panel
  let gfEditingPurchaseId = null;
  let gfEditingProductName = null;
  let gfEditingReceiptId = null;
  /** Set when CRA Summary Apply succeeds: purchases, aggregated rows, totals, date range (for CSV + ZIP export). */
  let gfLastSummaryContext = null;
  const GF_CURRENT_RECEIPT_KEY = 'gf_current_receipt_id';
  const GF_CURRENT_RECEIPT_NAME_KEY = 'gf_current_receipt_name';
  const GF_CURRENT_RECEIPT_DATE_KEY = 'gf_current_receipt_date';
  const GF_PRODUCT_PREFS_KEY = 'gf_product_prefs_v1';
  let gfProductsById = {};

  function parseUnitDescription(unitDescription) {
    const m = String(unitDescription || '').match(/per\s+([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)/i);
    if (!m) return null;
    return { value: Number(m[1]), unit: String(m[2]).toLowerCase() };
  }

  function loadGfProductPrefs() {
    try {
      const raw = localStorage.getItem(GF_PRODUCT_PREFS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveGfProductPrefs(prefs) {
    try {
      localStorage.setItem(GF_PRODUCT_PREFS_KEY, JSON.stringify(prefs || {}));
    } catch (e) {}
  }

  function setGfProductPref(productId, pref) {
    if (!productId) return;
    const all = loadGfProductPrefs();
    all[productId] = pref;
    saveGfProductPrefs(all);
  }

  function getGfProductPref(productId) {
    if (!productId) return null;
    const all = loadGfProductPrefs();
    return all[productId] || null;
  }

  function applyGfProductPrefill(productId) {
    if (!productId) return;
    const product = gfProductsById[productId] || null;
    const pref = getGfProductPref(productId);
    const regPriceEl = document.getElementById('gf-regular-unit');
    const gfTotalEl = document.getElementById('gf-total-paid');
    const gfSizeValEl = document.getElementById('gf-size-value');
    const gfSizeUnitEl = document.getElementById('gf-size-unit');
    const regSizeValEl = document.getElementById('gf-regular-size-value');
    const regSizeUnitEl = document.getElementById('gf-regular-size-unit');
    if (regPriceEl) {
      if (pref && pref.regularUnitPriceCents != null) regPriceEl.value = centsToDollars(pref.regularUnitPriceCents);
      else if (product && product.baseline_regular_unit_price_cents != null) regPriceEl.value = centsToDollars(product.baseline_regular_unit_price_cents);
    }
    if (product && product.unit_description && (!pref || pref.regularSizeValue == null)) {
      const parsed = parseUnitDescription(product.unit_description);
      if (parsed) {
        if (regSizeValEl) regSizeValEl.value = parsed.value;
        if (regSizeUnitEl) regSizeUnitEl.value = parsed.unit;
      }
    }
    if (pref) {
      if (gfTotalEl && pref.gfTotalCents != null) gfTotalEl.value = centsToDollars(pref.gfTotalCents);
      if (gfSizeValEl) gfSizeValEl.value = pref.gfSizeValue != null ? String(pref.gfSizeValue) : '';
      if (gfSizeUnitEl) gfSizeUnitEl.value = pref.gfSizeUnit || '';
      if (regSizeValEl && pref.regularSizeValue != null) regSizeValEl.value = String(pref.regularSizeValue);
      if (regSizeUnitEl) regSizeUnitEl.value = pref.regularSizeUnit || regSizeUnitEl.value || '';
    }
    gfLiveCalc();
  }

  function getCurrentGfReceipt() {
    try {
      let id = sessionStorage.getItem(GF_CURRENT_RECEIPT_KEY);
      let name = sessionStorage.getItem(GF_CURRENT_RECEIPT_NAME_KEY);
      let date = sessionStorage.getItem(GF_CURRENT_RECEIPT_DATE_KEY);
      return id ? { id: id, name: name || 'Receipt', date: date || null } : null;
    } catch (e) { return null; }
  }
  function setCurrentGfReceipt(receipt) {
    try {
      if (receipt) {
        sessionStorage.setItem(GF_CURRENT_RECEIPT_KEY, receipt.id);
        sessionStorage.setItem(GF_CURRENT_RECEIPT_NAME_KEY, receipt.name || 'Receipt');
        sessionStorage.setItem(GF_CURRENT_RECEIPT_DATE_KEY, receipt.date || '');
      } else {
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_KEY);
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_NAME_KEY);
        sessionStorage.removeItem(GF_CURRENT_RECEIPT_DATE_KEY);
      }
    } catch (e) {}
  }
  function renderGFReceiptState() {
    let noBlock = document.getElementById('gf-receipt-state');
    let hasBlock = document.getElementById('gf-receipt-has-current');
    let nameEl = document.getElementById('gf-receipt-current-name');
    let current = getCurrentGfReceipt();
    if (noBlock) noBlock.style.display = current ? 'none' : 'flex';
    if (hasBlock) hasBlock.style.display = current ? 'flex' : 'none';
    if (nameEl && current) nameEl.textContent = 'Current receipt: ' + current.name + (current.date ? ' (' + current.date + ')' : '') + ' — ';
  }

  function gfDollarsToCents(val) {
    const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.round(n * 100);
  }

  let GF_SIZE_UNITS = {
    g: { base: 1, kind: 'weight' },
    kg: { base: 1000, kind: 'weight' },
    oz: { base: 28.3495, kind: 'weight' },
    lb: { base: 453.592, kind: 'weight' },
    ml: { base: 1, kind: 'volume' },
    l: { base: 1000, kind: 'volume' }
  };

  function gfSizeToBase(value, unit) {
    if (value == null || value <= 0 || !unit) return null;
    let u = GF_SIZE_UNITS[unit.toLowerCase()];
    return u ? { base: value * u.base, kind: u.kind } : null;
  }

  function gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit) {
    let gf = gfSizeToBase(gfVal, gfUnit);
    let reg = gfSizeToBase(regVal, regUnit);
    if (!gf || !reg || gf.kind !== reg.kind) return null;
    return gf.base / reg.base;
  }

  function gfGetSizeRatioFromRow(r) {
    if (r.gf_size_value != null && r.regular_size_value != null && r.gf_size_unit && r.regular_size_unit)
      return gfGetSizeRatio(Number(r.gf_size_value), r.gf_size_unit, Number(r.regular_size_value), r.regular_size_unit);
    if (r.gf_size_grams != null && r.regular_size_grams != null && r.regular_size_grams > 0)
      return Number(r.gf_size_grams) / Number(r.regular_size_grams);
    return null;
  }

  function gfIncrementalCents(gfTotalCents, quantity, regularUnitCents, sizeRatio) {
    if (!quantity || quantity <= 0) return 0;
    if (sizeRatio != null && sizeRatio > 0) {
      let effectiveRegularTotalCents = quantity * regularUnitCents * sizeRatio;
      return Math.max(0, Math.round(gfTotalCents - effectiveRegularTotalCents));
    }
    let gfUnitCents = Math.round(gfTotalCents / quantity);
    let incPerUnit = Math.max(0, gfUnitCents - regularUnitCents);
    return Math.round(incPerUnit * quantity);
  }

  function gfIncrementalCentsForRow(r) {
    let ratio = gfGetSizeRatioFromRow(r);
    return gfIncrementalCents(
      Number(r.gf_total_cents),
      Number(r.quantity),
      Number(r.regular_unit_price_cents),
      ratio
    );
  }

  async function gfRefreshProductsDropdown() {
    const sel = document.getElementById('gf-product-select');
    if (!sel) return;
    const { data } = await gfApi.productsList();
    gfProductsById = {};
    (data || []).forEach(function (p) { gfProductsById[p.id] = p; });
    const opts = ['<option value="">— Select or add product —</option>'].concat((data || []).map(p => `<option value="${p.id}" data-cents="${p.baseline_regular_unit_price_cents ?? ''}">${p.name}${p.unit_description ? ' (' + p.unit_description + ')' : ''}</option>`));
    sel.innerHTML = opts.join('');
  }

  async function gfMarkReceiptDone() {
    let current = getCurrentGfReceipt();
    if (!current) return;
    let result = await gfApi.gfReceiptUpdate(current.id, { done_at: new Date().toISOString() });
    if (result.error) { showAppToast(result.error.message || 'Could not mark receipt done.', true); return; }
    setCurrentGfReceipt(null);
    renderGFReceiptState();
    gfReceiptsListRender();
    let dateEl = document.getElementById('gf-purchase-date');
    if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
  }

  function gfLiveCalc() {
    const q = parseFloat(document.getElementById('gf-quantity')?.value) || 0;
    const gfInputCents = gfDollarsToCents(document.getElementById('gf-total-paid')?.value);
    const totalIsPerUnit = document.getElementById('gf-total-is-per-unit')?.checked;
    const gfTotalCents = totalIsPerUnit && q > 0 ? Math.round(gfInputCents * q) : gfInputCents;
    const regCents = gfDollarsToCents(document.getElementById('gf-regular-unit')?.value);
    let gfVal = parseFloat(document.getElementById('gf-size-value')?.value) || null;
    let gfUnit = document.getElementById('gf-size-unit')?.value || null;
    let regVal = parseFloat(document.getElementById('gf-regular-size-value')?.value) || null;
    let regUnit = document.getElementById('gf-regular-size-unit')?.value || null;
    let sizeRatio = gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit);
    const unitPrice = document.getElementById('gf-unit-price-out');
    const incUnit = document.getElementById('gf-inc-unit-out');
    const incTotal = document.getElementById('gf-inc-total-out');
    if (!unitPrice || !incUnit || !incTotal) return;
    if (!q || q <= 0) {
      unitPrice.textContent = '—';
      incUnit.textContent = '—';
      incTotal.textContent = '—';
      return;
    }
    const gfUnitCents = Math.round(gfTotalCents / q);
    const useSize = sizeRatio != null && sizeRatio > 0;
    let incPerUnitCents, totalInc;
    if (useSize) {
      totalInc = gfIncrementalCents(gfTotalCents, q, regCents, sizeRatio);
      incPerUnitCents = q ? Math.round(totalInc / q) : 0;
    } else {
      incPerUnitCents = Math.max(0, gfUnitCents - regCents);
      totalInc = Math.round(incPerUnitCents * q);
    }
    unitPrice.textContent = '$' + centsToDollars(gfUnitCents);
    incUnit.textContent = '$' + centsToDollars(incPerUnitCents) + (useSize ? ' (size-adj.)' : '');
    incTotal.textContent = '$' + centsToDollars(totalInc) + (useSize ? ' (size-adj.)' : '');
    let mismatchHint = document.getElementById('gf-size-mismatch-hint');
    if (mismatchHint) {
      if (gfVal && gfUnit && regVal && regUnit && !useSize) {
        let gfB = gfSizeToBase(gfVal, gfUnit), regB = gfSizeToBase(regVal, regUnit);
        if (gfB && regB && gfB.kind !== regB.kind) {
          mismatchHint.textContent = 'One size is weight and the other is volume — size adjustment not applied.';
          mismatchHint.style.display = 'inline';
        } else { mismatchHint.textContent = ''; mismatchHint.style.display = 'none'; }
      } else { mismatchHint.textContent = ''; mismatchHint.style.display = 'none'; }
    }
  }

  function loadGFPanel() {
    const dateEl = document.getElementById('gf-purchase-date');
    let current = getCurrentGfReceipt();
    if (dateEl && !dateEl.value) dateEl.value = (current && current.date) ? current.date : new Date().toISOString().slice(0, 10);
    gfRefreshProductsDropdown();
    renderGFReceiptState();
    gfPurchasesListRender();
    gfReceiptsListRender();
    gfSummaryYearOptions();
    let newProductInline = document.getElementById('gf-new-product-inline');
    if (newProductInline) newProductInline.style.display = 'none';
    const cancelBtn = document.getElementById('gf-cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    gfEditingPurchaseId = null;
    gfEditingReceiptId = null;
    let newProductBtn = document.getElementById('gf-product-new-btn');
    if (newProductBtn && !newProductBtn.getAttribute('data-gf-bound')) {
      newProductBtn.setAttribute('data-gf-bound', 'true');
      newProductBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (newProductInline) { newProductInline.style.display = 'block'; document.getElementById('gf-prod-name')?.focus(); }
      });
    }
    let addUseBtn = document.getElementById('gf-prod-add-use-btn');
    let prodCancelBtn = document.getElementById('gf-prod-cancel-btn');
    let prodBcBtn = document.getElementById('gf-prod-bc-avg-btn');
    if (addUseBtn && !addUseBtn.getAttribute('data-gf-bound')) { addUseBtn.setAttribute('data-gf-bound', 'true'); addUseBtn.addEventListener('click', gfAddAndUseProduct); }
    if (prodCancelBtn && !prodCancelBtn.getAttribute('data-gf-bound')) { prodCancelBtn.setAttribute('data-gf-bound', 'true'); prodCancelBtn.addEventListener('click', function () { if (newProductInline) newProductInline.style.display = 'none'; }); }
    if (prodBcBtn && !prodBcBtn.getAttribute('data-gf-bound')) { prodBcBtn.setAttribute('data-gf-bound', 'true'); prodBcBtn.addEventListener('click', function () { gfFetchBCAverage(); }); }
    let doneBtn = document.getElementById('gf-receipt-done-btn');
    if (doneBtn && !doneBtn.getAttribute('data-gf-bound')) {
      doneBtn.setAttribute('data-gf-bound', 'true');
      doneBtn.addEventListener('click', function () { gfMarkReceiptDone(); });
    }
  }

  function gfSummaryYearOptions() {
    const sel = document.getElementById('gf-summary-year');
    if (!sel) return;
    const y = new Date().getFullYear();
    sel.innerHTML = ['<option value="">Custom range below</option>'].concat([y, y - 1, y - 2].map(yr => `<option value="${yr}">${yr} (Jan 1 – Dec 31)</option>`)).join('');
  }

  async function gfPurchasesListRender() {
    const list = document.getElementById('gf-purchases-list');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    const { data, error } = await gfApi.purchasesList({});
    if (error) { list.innerHTML = '<p class="empty-state">Could not load.</p>'; return; }
    const rows = (data || []).slice(0, 50);
    if (rows.length === 0) {
      list.innerHTML = '<p class="empty-state">No GF lines yet. Upload a receipt, pick a product, and save a line.</p>';
      return;
    }
    list.innerHTML = rows.map(r => {
      const incCents = gfIncrementalCentsForRow(r);
      return `<div class="entry-row" data-id="${escapeHtmlAttr(r.id)}">
        <span class="date">${formatDate(r.purchase_date)}</span>
        <span class="meta">${escapeHtml(r.product_name)} × ${Number(r.quantity)}</span>
        <span class="amount">GF $${centsToDollars(r.gf_total_cents)} → +$${centsToDollars(incCents)}</span>
        <div class="actions">
          <button type="button" class="edit-btn" data-id="${r.id}">Edit</button>
          <button type="button" class="delete-btn" data-id="${r.id}">Delete</button>
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => gfEditPurchase(btn.dataset.id)));
    list.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => gfDeletePurchase(btn.dataset.id, btn)));
  }

  async function gfReceiptsListRender() {
    let list = document.getElementById('gf-receipts-list');
    if (!list) return;
    list.innerHTML = '<p class="empty-state">Loading…</p>';
    let result = await gfApi.gfReceiptsList();
    if (result.error) { list.innerHTML = '<p class="empty-state">Could not load receipts.</p>'; return; }
    let receipts = result.data || [];
    if (receipts.length === 0) {
      list.innerHTML = '<p class="empty-state">No receipts yet. Upload a receipt above to start.</p>';
      return;
    }
    list.innerHTML = receipts.map(function (r) {
      let dateLabel = r.receipt_date ? formatDate(r.receipt_date) : (r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
      let doneLabel = r.done_at ? ' <span class="gf-receipt-done">Done</span>' : '';
      return '<div class="entry-row gf-receipt-row" data-path="' + escapeHtmlAttr(r.file_path || '') + '">' +
        '<span class="date">' + escapeHtml(dateLabel) + '</span>' +
        '<span class="meta">' + escapeHtml(r.file_name || 'Receipt') + doneLabel + '</span>' +
        '<div class="actions"><button type="button" class="view-receipt-btn">View</button></div>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.view-receipt-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        let row = btn.closest('.gf-receipt-row');
        let path = row && row.getAttribute('data-path');
        if (!path) return;
        gfApi.getGfReceiptUrl(path).then(function (res) {
          if (res.error) { showAppToast(res.error.message || 'Could not open receipt.', true); return; }
          if (res.url) window.open(res.url, '_blank');
        });
      });
    });
  }

  async function gfSaveLine() {
    const productSelect = document.getElementById('gf-product-select');
    const productId = productSelect?.value || null;
    let productName = (productSelect?.selectedOptions?.[0]?.textContent?.replace(/\s*\([^)]*\)\s*$/, '').trim()) || '';
    if ((!productName || productName.startsWith('—')) && gfEditingPurchaseId && gfEditingProductName) productName = gfEditingProductName;
    const dateEl = document.getElementById('gf-purchase-date');
    const quantity = parseFloat(document.getElementById('gf-quantity')?.value);
    const gfTotalCents = gfDollarsToCents(document.getElementById('gf-total-paid')?.value);
    const regularUnitCents = gfDollarsToCents(document.getElementById('gf-regular-unit')?.value);
    let currentReceipt = getCurrentGfReceipt();
    const receiptId = gfEditingPurchaseId ? (gfEditingReceiptId || null) : (currentReceipt ? currentReceipt.id : null);
    if (!dateEl?.value) { showAppToast('Please set date.', true); return; }
    if (!quantity || quantity <= 0) { showAppToast('Please enter a quantity greater than 0.', true); return; }
    if (!productName || productName.startsWith('—')) { showAppToast('Please select or add a product.', true); return; }
    const totalIsPerUnit = document.getElementById('gf-total-is-per-unit')?.checked;
    const effectiveGfTotalCents = totalIsPerUnit ? Math.round(gfDollarsToCents(document.getElementById('gf-total-paid')?.value) * quantity) : gfTotalCents;
    if (effectiveGfTotalCents < 0) { showAppToast('Please enter GF total paid (0 or more).', true); return; }
    if (regularUnitCents < 0) { showAppToast('Please enter regular price per unit (0 or more).', true); return; }
    let gfVal = parseFloat(document.getElementById('gf-size-value')?.value) || null;
    let gfUnit = document.getElementById('gf-size-unit')?.value || null;
    let regVal = parseFloat(document.getElementById('gf-regular-size-value')?.value) || null;
    let regUnit = document.getElementById('gf-regular-size-unit')?.value || null;
    let sizeRatio = gfGetSizeRatio(gfVal, gfUnit, regVal, regUnit);
    const incCents = gfIncrementalCents(effectiveGfTotalCents, quantity, regularUnitCents, sizeRatio);
    const saveBtn = document.getElementById('gf-save-line-btn');
    const runGfPersist = async () => {
    const payload = {
      purchase_date: dateEl.value,
      receipt_id: receiptId || null,
      product_id: productId || null,
      product_name: productName,
      quantity,
      gf_total_cents: effectiveGfTotalCents,
      regular_unit_price_cents: regularUnitCents,
      gf_size_value: gfVal,
      gf_size_unit: gfUnit || null,
      regular_size_value: regVal,
      regular_size_unit: regUnit || null,
      includes_only_you: true
    };
    if (gfEditingPurchaseId) {
      const { error } = await gfApi.purchaseUpdate(gfEditingPurchaseId, payload);
      if (error) { showAppToast(error.message || 'Update failed', true); return; }
      gfEditingPurchaseId = null;
      document.getElementById('gf-cancel-edit-btn').style.display = 'none';
    } else {
      const { error } = await gfApi.purchaseInsert(payload);
      if (error) { showAppToast(error.message || 'Insert failed', true); return; }
    }

    if (productId) {
      setGfProductPref(productId, {
        regularUnitPriceCents: regularUnitCents,
        gfTotalCents: effectiveGfTotalCents,
        gfSizeValue: gfVal,
        gfSizeUnit: gfUnit || '',
        regularSizeValue: regVal,
        regularSizeUnit: regUnit || ''
      });
      const unitDescription = (regVal != null && regVal > 0 && regUnit) ? ('per ' + regVal + ' ' + regUnit) : null;
      await gfApi.productUpsert({
        id: productId,
        name: productName,
        baseline_regular_unit_price_cents: regularUnitCents,
        unit_description: unitDescription
      });
    }

    gfPurchasesListRender();
    document.getElementById('gf-quantity').value = '';
    let perUnitChk = document.getElementById('gf-total-is-per-unit');
    if (perUnitChk) perUnitChk.checked = false;
    if (productId) {
      applyGfProductPrefill(productId);
    } else {
      document.getElementById('gf-total-paid').value = '';
      document.getElementById('gf-regular-unit').value = '';
      let sv = document.getElementById('gf-size-value'), su = document.getElementById('gf-size-unit');
      let rv = document.getElementById('gf-regular-size-value'), ru = document.getElementById('gf-regular-size-unit');
      if (sv) sv.value = ''; if (su) su.value = ''; if (rv) rv.value = ''; if (ru) ru.value = '';
    }
    gfLiveCalc();
    };
    if (incCents === 0) {
      showInlineConfirm(saveBtn, 'Incremental cost is $0. Save anyway?', () => { void runGfPersist(); }, { confirmLabel: 'Save anyway' });
      return;
    }
    await runGfPersist();
  }

  async function gfEditPurchase(id) {
    const { data, error } = await gfApi.purchasesList({});
    if (error || !data) return;
    const r = data.find(x => x.id === id);
    if (!r) return;
    gfEditingPurchaseId = id;
    gfEditingProductName = r.product_name || null;
    document.getElementById('gf-purchase-date').value = r.purchase_date;
    document.getElementById('gf-product-select').value = r.product_id || '';
    document.getElementById('gf-quantity').value = r.quantity;
    document.getElementById('gf-total-paid').value = centsToDollars(r.gf_total_cents);
    document.getElementById('gf-regular-unit').value = centsToDollars(r.regular_unit_price_cents);
    let sv = document.getElementById('gf-size-value'), su = document.getElementById('gf-size-unit');
    let rv = document.getElementById('gf-regular-size-value'), ru = document.getElementById('gf-regular-size-unit');
    if (sv) sv.value = r.gf_size_value != null ? r.gf_size_value : (r.gf_size_grams != null ? r.gf_size_grams : '');
    if (su) su.value = r.gf_size_unit || (r.gf_size_grams != null ? 'g' : '');
    if (rv) rv.value = r.regular_size_value != null ? r.regular_size_value : (r.regular_size_grams != null ? r.regular_size_grams : '');
    if (ru) ru.value = r.regular_size_unit || (r.regular_size_grams != null ? 'g' : '');
    gfEditingReceiptId = r.receipt_id || null;
    document.getElementById('gf-cancel-edit-btn').style.display = 'inline-block';
    gfLiveCalc();
  }

  function gfDeletePurchase(id, triggerEl) {
    showInlineConfirm(triggerEl, 'Delete this GF line?', () => {
      gfApi.purchaseDelete(id).then(({ error }) => {
        if (error) showAppToast(error.message || 'Delete failed', true);
        else { gfPurchasesListRender(); if (gfEditingPurchaseId === id) { gfEditingPurchaseId = null; document.getElementById('gf-cancel-edit-btn').style.display = 'none'; } }
      });
    });
  }

  function gfAggregateSummary(purchases) {
    const byName = {};
    purchases.forEach(r => {
      const key = r.product_name;
      if (!byName[key]) byName[key] = { total_quantity: 0, sum_regular: 0, sum_gf: 0, incremental_total_cents: 0, count: 0 };
      const q = Number(r.quantity);
      byName[key].total_quantity += q;
      byName[key].sum_regular += Number(r.regular_unit_price_cents) * q;
      byName[key].sum_gf += Number(r.gf_total_cents);
      byName[key].incremental_total_cents += gfIncrementalCentsForRow(r);
      byName[key].count += 1;
    });
    return Object.entries(byName).map(([product_name, o]) => {
      const avgRegular = o.total_quantity ? Math.round(o.sum_regular / o.total_quantity) : 0;
      const avgGf = o.total_quantity ? Math.round(o.sum_gf / o.total_quantity) : 0;
      const incremental_total_cents = Math.round(o.incremental_total_cents);
      const incPerUnit = o.total_quantity ? Math.round(incremental_total_cents / o.total_quantity) : 0;
      return {
        product_name,
        total_quantity: o.total_quantity,
        avg_regular_unit_price_cents: avgRegular,
        avg_gf_unit_price_cents: avgGf,
        incremental_per_unit_cents: incPerUnit,
        incremental_total_cents: incremental_total_cents
      };
    });
  }

  function gfBuildSummaryCsvFromContext(ctx) {
    if (!ctx || !ctx.rows || ctx.rows.length === 0) return '';
    const lines = [];
    lines.push('"Product","# bought","Avg regular/unit","Avg GF/unit","Incremental/unit","Amount to claim"');
    ctx.rows.forEach(r => {
      lines.push([
        '"' + String(r.product_name).replace(/"/g, '""') + '"',
        String(r.total_quantity),
        '"$' + centsToDollars(r.avg_regular_unit_price_cents) + '"',
        '"$' + centsToDollars(r.avg_gf_unit_price_cents) + '"',
        '"$' + centsToDollars(r.incremental_per_unit_cents) + '"',
        '"$' + centsToDollars(r.incremental_total_cents) + '"'
      ].join(','));
    });
    lines.push('');
    lines.push('"Total incremental gluten-free cost for this period: $' + centsToDollars(ctx.totalCents) + ' (use as medical expense on lines 33099/33199)."');
    if (ctx.from && ctx.to) lines.push('', '"Period: ' + String(ctx.from) + ' to ' + String(ctx.to).replace(/"/g, '""') + '"');
    return lines.join('\n');
  }

  async function gfSummaryApply() {
    const yearSel = document.getElementById('gf-summary-year');
    const fromEl = document.getElementById('gf-summary-from');
    const toEl = document.getElementById('gf-summary-to');
    let from, to;
    if (yearSel?.value) {
      const y = parseInt(yearSel.value, 10);
      from = y + '-01-01';
      to = y + '-12-31';
    } else {
      from = fromEl?.value;
      to = toEl?.value;
    }
    if (!from || !to) { showAppToast('Choose a year or enter from/to dates.', true); return; }
    const { data, error } = await gfApi.purchasesList({ from, to });
    if (error) {
      gfLastSummaryContext = null;
      document.getElementById('gf-summary-table-wrap').innerHTML = '<p class="empty-state">Could not load.</p>';
      return;
    }
    const purchases = data || [];
    const rows = gfAggregateSummary(purchases);
    const totalCents = rows.reduce((s, r) => s + r.incremental_total_cents, 0);
    gfLastSummaryContext = { purchases, rows, totalCents, from, to };
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const totalLine = document.getElementById('gf-summary-total');
    if (rows.length === 0) {
      tableWrap.innerHTML = '<p class="empty-state">No GF purchases in this period.</p>';
      totalLine.textContent = '';
      return;
    }
    tableWrap.innerHTML = `
      <table class="report-table"><thead><tr>
        <th>Product</th><th># bought</th><th>Avg regular/unit</th><th>Avg GF/unit</th><th>Incremental/unit</th><th>Amount to claim</th>
      </tr></thead><tbody>
        ${rows.map(r => `<tr>
          <td>${escapeHtml(r.product_name)}</td>
          <td>${r.total_quantity}</td>
          <td class="amount">$${centsToDollars(r.avg_regular_unit_price_cents)}</td>
          <td class="amount">$${centsToDollars(r.avg_gf_unit_price_cents)}</td>
          <td class="amount">$${centsToDollars(r.incremental_per_unit_cents)}</td>
          <td class="amount">$${centsToDollars(r.incremental_total_cents)}</td>
        </tr>`).join('')}
      </tbody></table>
    `;
    totalLine.innerHTML = '<strong>Total incremental gluten-free cost for this period: $' + centsToDollars(totalCents) + '</strong> (use as medical expense on lines 33099/33199).';
  }

  function gfExportCsv() {
    const ctx = gfLastSummaryContext;
    if (ctx && ctx.rows && ctx.rows.length > 0) {
      const csv = gfBuildSummaryCsvFromContext(ctx);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gf-medical-summary.csv';
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const table = tableWrap?.querySelector('table');
    if (!table) { showAppToast('Run the summary first (choose period and click Apply).', true); return; }
    const rows = table.querySelectorAll('tr');
    const lines = [];
    rows.forEach(tr => {
      const cells = tr.querySelectorAll('th, td');
      lines.push(Array.from(cells).map(c => '"' + c.textContent.trim().replace(/"/g, '""') + '"').join(','));
    });
    const totalLine = document.getElementById('gf-summary-total')?.textContent || '';
    if (totalLine) lines.push('', totalLine);
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gf-medical-summary.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function gfExportReportWithReceiptsZip() {
    const ctx = gfLastSummaryContext;
    if (!ctx || !ctx.purchases || ctx.purchases.length === 0) {
      showAppToast('Run the summary first (choose period and click Apply).', true);
      return;
    }
    if (!ctx.rows || ctx.rows.length === 0) {
      showAppToast('No GF purchases in this period — nothing to put in the report.', true);
      return;
    }
    if (typeof JSZip === 'undefined') {
      showAppToast('ZIP helper did not load. Refresh the page and try again.', true);
      return;
    }
    const btn = document.getElementById('gf-export-zip-btn');
    let prevText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Building ZIP…'; }
    try {
      const zip = new JSZip();
      zip.file('gf-medical-summary.csv', gfBuildSummaryCsvFromContext(ctx));
      zip.file('READ_ME.txt', [
        'Gluten-free medical expense report pack',
        '',
        'Period: ' + ctx.from + ' to ' + ctx.to,
        '',
        'gf-medical-summary.csv — incremental GF amounts by product (CRA-style summary).',
        'receipts/ — files linked to GF line items in this period (for your records).',
        '',
        'Use the summary total as part of medical expenses (lines 33099/33199) when filing.'
      ].join('\n'));

      const receiptIdSet = new Set();
      ctx.purchases.forEach(function (p) {
        if (p.receipt_id) receiptIdSet.add(p.receipt_id);
      });
      const ids = Array.from(receiptIdSet);
      const receiptsFolder = zip.folder('receipts');
      const missing = [];
      const fetchFailed = [];
      const usedNames = {};

      if (ids.length) {
        const { data: recRows, error: recErr } = await gfApi.gfReceiptsByIds(ids);
        if (recErr) {
          showAppToast(recErr.message || String(recErr) || 'Could not load receipt list.', true);
          return;
        }
        const byId = {};
        (recRows || []).forEach(function (r) { byId[r.id] = r; });
        for (let i = 0; i < ids.length; i++) {
          let rid = ids[i];
          let rec = byId[rid];
          if (!rec) {
            missing.push(rid);
            continue;
          }
          let urlRes = await gfApi.getGfReceiptUrl(rec.file_path);
          if (urlRes.error || !urlRes.url) {
            fetchFailed.push(rec.file_name || rid);
            continue;
          }
          try {
            let res = await fetch(urlRes.url);
            if (!res.ok) {
              fetchFailed.push(rec.file_name || rid);
              continue;
            }
            let fileBlob = await res.blob();
            let baseName = (rec.file_name || 'receipt').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
            if (!baseName.trim()) baseName = 'receipt';
            let safeName = rid.slice(0, 8) + '_' + baseName;
            if (usedNames[safeName]) {
              usedNames[safeName] += 1;
              let dot = safeName.lastIndexOf('.');
              if (dot > 0) {
                safeName = safeName.slice(0, dot) + '_' + usedNames[safeName] + safeName.slice(dot);
              } else {
                safeName = safeName + '_' + usedNames[safeName];
              }
            } else {
              usedNames[safeName] = 1;
            }
            receiptsFolder.file(safeName, fileBlob);
          } catch (e) {
            fetchFailed.push(rec.file_name || rid);
          }
        }
      }

      let notes = [];
      if (ids.length === 0) notes.push('No receipt files were linked to GF line items in this period.');
      if (missing.length) notes.push('Missing receipt records in database: ' + missing.join(', '));
      if (fetchFailed.length) notes.push('Could not download file: ' + fetchFailed.join(', '));
      if (notes.length) receiptsFolder.file('_notes.txt', notes.join('\n'));

      let outBlob = await zip.generateAsync({ type: 'blob' });
      let nameSafe = ('gf-medical-report_' + ctx.from + '_' + ctx.to).replace(/[^a-zA-Z0-9._-]/g, '-');
      let a = document.createElement('a');
      a.href = URL.createObjectURL(outBlob);
      a.download = nameSafe + '.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = prevText || 'Download report + receipts (ZIP)';
      }
    }
  }

  async function gfAddAndUseProduct() {
    const name = document.getElementById('gf-prod-name')?.value?.trim();
    if (!name) { showAppToast('Enter product name.', true); return; }
    const baseline = document.getElementById('gf-prod-baseline')?.value;
    const baselineCents = baseline !== '' && baseline !== undefined ? gfDollarsToCents(baseline) : null;
    const sizeVal = document.getElementById('gf-prod-size-value')?.value;
    const sizeUnit = document.getElementById('gf-prod-size-unit')?.value || null;
    const sizeNum = sizeVal !== '' && sizeVal != null ? parseFloat(sizeVal) : null;
    let unitDescription = null;
    if (sizeNum != null && sizeNum > 0 && sizeUnit) unitDescription = 'per ' + sizeNum + ' ' + sizeUnit;
    const row = { name, baseline_regular_unit_price_cents: baselineCents, unit_description: unitDescription };
    const { data, error } = await gfApi.productUpsert(row);
    if (error) { showAppToast(error.message || 'Save failed', true); return; }
    let inline = document.getElementById('gf-new-product-inline');
    if (inline) inline.style.display = 'none';
    await gfRefreshProductsDropdown();
    let sel = document.getElementById('gf-product-select');
    if (sel && data && data.id) sel.value = data.id;
    if (baseline !== '' && baseline !== undefined) document.getElementById('gf-regular-unit').value = baseline;
    if (sizeNum != null && sizeNum > 0 && sizeUnit) {
      document.getElementById('gf-regular-size-value').value = sizeNum;
      document.getElementById('gf-regular-size-unit').value = sizeUnit;
    }
    document.getElementById('gf-prod-name').value = '';
    document.getElementById('gf-prod-baseline').value = '';
    document.getElementById('gf-prod-size-value').value = '';
    document.getElementById('gf-prod-size-unit').value = '';
    let h = document.getElementById('gf-prod-bc-hint');
    if (h) h.textContent = '';
    gfLiveCalc();
  }

  const STATCAN_PID_FOOD = 18100245;
  const GF_STATCAN_PRODUCT_MAP = {
    bread: ['bread', 'Bread'],
    pasta: ['pasta', 'spaghetti', 'Spaghetti'],
    flour: ['flour', 'Flour'],
    crackers: ['crackers', 'Crackers'],
    cookies: ['cookies', 'Cookies'],
    'baking mix': ['baking', 'mix'],
    cereal: ['cereal', 'Cereal'],
    rice: ['rice', 'Rice']
  };

  async function statcanFetchBCPrice(productName) {
    if (!productName || typeof productName !== 'string') return { error: 'Enter a product name.' };
    const key = productName.toLowerCase().trim();
    let productMatch = null;
    for (const [mapKey, keywords] of Object.entries(GF_STATCAN_PRODUCT_MAP)) {
      if (keywords.some(kw => key.includes(kw) || mapKey.includes(key))) {
        productMatch = mapKey;
        break;
      }
    }
    if (!productMatch) return { error: 'Product not in lookup list. Try: bread, pasta, flour, crackers, cookies, cereal, rice, or add price manually.' };

    try {
      const metaRes = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ productId: STATCAN_PID_FOOD }])
      });
      if (!metaRes.ok) return { error: 'Could not load price data (StatsCan metadata).' };
      const metaJson = await metaRes.json();
      const meta = Array.isArray(metaJson) ? metaJson[0] : metaJson;
      if (!meta?.object?.dimension) return { error: 'Unexpected StatsCan response.' };

      const dimensions = meta.object.dimension;
      let geoMemberId = null;
      let productMemberId = null;
      const coordParts = [];

      for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        const nameEn = (dim.dimensionNameEn || '').toLowerCase();
        const members = dim.member || [];
        if (nameEn.includes('geograph')) {
          const bc = members.find(m => (m.memberNameEn || '').toLowerCase().includes('british columbia'));
          geoMemberId = bc ? bc.memberId : (members[0]?.memberId);
          coordParts.push(geoMemberId != null ? geoMemberId : 0);
        } else if (nameEn.includes('product') || nameEn.includes('item')) {
          const match = members.find(m => {
            const en = (m.memberNameEn || '').toLowerCase();
            return GF_STATCAN_PRODUCT_MAP[productMatch].some(kw => en.includes(kw));
          });
          productMemberId = match ? match.memberId : (members[0]?.memberId);
          coordParts.push(productMemberId != null ? productMemberId : 0);
        } else {
          coordParts.push(members[0]?.memberId != null ? members[0].memberId : 0);
        }
      }
      while (coordParts.length < 10) coordParts.push(0);
      const coordinate = coordParts.slice(0, 10).join('.');

      const dataRes = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ productId: STATCAN_PID_FOOD, coordinate, latestN: 1 }])
      });
      if (!dataRes.ok) return { error: 'Could not load price value.' };
      const dataJson = await dataRes.json();
      const dataObj = Array.isArray(dataJson) ? dataJson[0] : dataJson;
      const points = dataObj?.object?.vectorDataPoint;
      if (!points || points.length === 0) return { error: 'No recent price for this product in BC.' };

      const pt = points[0];
      let value = parseFloat(pt.value);
      if (Number.isNaN(value)) return { error: 'Invalid price value.' };
      const decimals = pt.decimals != null ? pt.decimals : 2;
      if (decimals > 0 && value > 0 && value < 100) value = Math.round(value * 100) / 100;
      const refPer = pt.refPer || pt.refPerRaw || '';
      const periodLabel = refPer ? (refPer.slice(0, 7).replace('-', ' ') + ' (BC)') : 'BC average';

      return { priceDollars: value, label: periodLabel };
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) return { error: 'Network or CORS: use the Supabase Edge Function for BC lookup (see README).' };
      return { error: (err.message || 'Lookup failed.') };
    }
  }

  async function fetchBCAverageForProduct(productName) {
    if (!productName) return { error: 'Enter a product name first.' };
    return await statcanFetchBCPrice(productName);
  }

  function gfFetchBCAverage() {
    document.getElementById('gf-prod-bc-hint').textContent = 'Loading…';
    fetchBCAverageForProduct(document.getElementById('gf-prod-name')?.value?.trim()).then(result => {
      const hint = document.getElementById('gf-prod-bc-hint');
      if (result.error) { hint.textContent = result.error; return; }
      document.getElementById('gf-prod-baseline').value = result.priceDollars != null ? result.priceDollars.toFixed(2) : '';
      hint.textContent = result.label || 'BC average applied.';
    });
  }

  function initGFPanelListeners() {
    document.getElementById('gf-product-select')?.addEventListener('change', () => {
      const sel = document.getElementById('gf-product-select');
      const opt = sel?.selectedOptions?.[0];
      const cents = opt?.dataset?.cents;
      if (cents !== undefined && cents !== '') document.getElementById('gf-regular-unit').value = (parseInt(cents, 10) / 100).toFixed(2);
      applyGfProductPrefill(sel?.value || null);
      gfLiveCalc();
    });
    ['gf-quantity', 'gf-total-paid', 'gf-regular-unit', 'gf-size-value', 'gf-regular-size-value', 'gf-size-unit', 'gf-regular-size-unit', 'gf-total-is-per-unit'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', gfLiveCalc);
      document.getElementById(id)?.addEventListener('change', gfLiveCalc);
    });
    document.getElementById('gf-save-line-btn')?.addEventListener('click', gfSaveLine);
    document.getElementById('gf-cancel-edit-btn')?.addEventListener('click', () => {
      gfEditingPurchaseId = null;
      gfEditingProductName = null;
      document.getElementById('gf-cancel-edit-btn').style.display = 'none';
    });
    document.getElementById('gf-receipt-upload-btn')?.addEventListener('click', () => document.getElementById('gf-receipt-file').click());
    document.getElementById('gf-receipt-file')?.addEventListener('change', async (e) => {
      let file = e.target.files[0];
      if (!file) return;
      let dateEl = document.getElementById('gf-purchase-date');
      let result = await gfApi.gfReceiptUpload(file, dateEl && dateEl.value ? dateEl.value : null);
      e.target.value = '';
      if (result.error) { showAppToast(result.error.message || 'Upload failed', true); return; }
      let data = result.data;
      if (data && data.id) {
        setCurrentGfReceipt({
          id: data.id,
          name: data.file_name || file.name,
          date: data.receipt_date || (dateEl && dateEl.value ? dateEl.value : null)
        });
        if (data.receipt_date && dateEl) dateEl.value = data.receipt_date;
        renderGFReceiptState();
        gfReceiptsListRender();
      }
    });
    document.getElementById('gf-summary-apply')?.addEventListener('click', gfSummaryApply);
    document.getElementById('gf-export-btn')?.addEventListener('click', gfExportCsv);
    document.getElementById('gf-export-zip-btn')?.addEventListener('click', function () { gfExportReportWithReceiptsZip(); });
    document.getElementById('gf-print-btn')?.addEventListener('click', gfPrintSummary);
  }

  function gfPrintSummary() {
    const tableWrap = document.getElementById('gf-summary-table-wrap');
    const totalLine = document.getElementById('gf-summary-total');
    const table = tableWrap?.querySelector('table');
    if (!table || !totalLine?.textContent) {
      showAppToast('Run the summary first (choose period and click Apply).', true);
      return;
    }
    const win = window.open('', '_blank');
    const totalText = totalLine.textContent || totalLine.innerText || '';
    win.document.write(
      '<!DOCTYPE html><html><head><title>GF Medical Summary</title>' +
      '<style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:800px;margin:0 auto} table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:0.5rem;border-bottom:1px solid #ddd} td.amount{text-align:right} .total{margin-top:1rem;font-weight:bold}</style></head><body>' +
      '<h1>Gluten-free medical expense summary</h1><p>Use as part of your medical expenses (lines 33099/33199).</p>' +
      table.outerHTML + '<p class="total">' + escapeHtml(totalText) + '</p>' +
      '</body></html>'
    );
    win.document.close();
  }

  return {
    loadGFPanel,
    initGFPanelListeners,
    gfExportCsv,
    gfPrintSummary,
    gfFetchBCAverage
  };
}
