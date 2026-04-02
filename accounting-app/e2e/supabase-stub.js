/**
 * In-memory Supabase client shape for Ledger E2E (no network).
 * Loaded in place of the CDN bundle by e2e/server.mjs.
 */
(function () {
  'use strict';

  var E2E_USER = { id: '00000000-0000-0000-0000-0000000000e1', email: 'e2e@ledger.test' };
  var session = { user: E2E_USER, access_token: 'e2e-token' };
  var authListeners = [];

  var idCounter = 1;
  function makeId(prefix) {
    idCounter += 1;
    return (prefix || 'e2e-id') + '-' + idCounter;
  }

  var db = {
    acct_income: [
      { id: 'e2e-income-1', user_id: E2E_USER.id, date: '2026-02-15', amount_cents: 10000, gst_cents: 500, income_type: 'gig', vendor: 'Client A', client_or_project: '', note: '' },
    ],
    acct_expenses: [
      { id: 'e2e-exp-1', user_id: E2E_USER.id, date: '2026-02-10', amount_cents: 2500, gst_cents: 0, category: '8810', vendor: 'Vendor B', note: '', total_payment_cents: null },
    ],
    acct_bank_transactions: [],
    acct_reconciliation: [],
    acct_categorization_rules: [],
    acct_planned: [],
    acct_receipts: [],
    gf_products: [],
    gf_purchases: [],
    gf_receipts: [],
  };

  function fireAuth(evt, sess) {
    authListeners.forEach(function (cb) {
      try { cb(evt, sess); } catch (_e) {}
    });
  }

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function resolveComparator(op, left, right) {
    if (op === 'eq') return left === right;
    if (op === 'is') return (right === null ? left == null : left === right);
    if (op === 'gte') return left >= right;
    if (op === 'lte') return left <= right;
    if (op === 'in') return Array.isArray(right) && right.indexOf(left) >= 0;
    return true;
  }

  function applyFilters(rows, filters) {
    return rows.filter(function (r) {
      return filters.every(function (f) {
        return resolveComparator(f.op, r[f.col], f.val);
      });
    });
  }

  function applyOrder(rows, orderBy) {
    if (!orderBy || !orderBy.col) return rows;
    var dir = orderBy.asc ? 1 : -1;
    return rows.slice().sort(function (a, b) {
      var av = a[orderBy.col];
      var bv = b[orderBy.col];
      if (av === bv) return 0;
      return av > bv ? dir : -dir;
    });
  }

  function enrichRows(tableName, rows) {
    if (tableName !== 'acct_bank_transactions') return rows;
    return rows.map(function (tx) {
      var out = Object.assign({}, tx);
      out.acct_reconciliation = db.acct_reconciliation.filter(function (r) {
        return r.bank_transaction_id === tx.id;
      }).map(function (r) { return { id: r.id }; });
      return out;
    });
  }

  function makeResolvedPromise(payload) {
    return Promise.resolve(payload);
  }

  function makeThenable(payload) {
    var p = makeResolvedPromise(payload);
    return {
      then: p.then.bind(p),
      catch: p.catch.bind(p),
      finally: p.finally.bind(p),
    };
  }

  function selectBuilder(tableName) {
    var filters = [];
    var orderBy = null;

    function runSelect() {
      var rows = db[tableName] || [];
      rows = applyFilters(rows, filters);
      rows = applyOrder(rows, orderBy);
      rows = enrichRows(tableName, rows);
      return { data: deepClone(rows), error: null };
    }

    var chain = {
      eq: function (col, val) { filters.push({ op: 'eq', col: col, val: val }); return chain; },
      is: function (col, val) { filters.push({ op: 'is', col: col, val: val }); return chain; },
      gte: function (col, val) { filters.push({ op: 'gte', col: col, val: val }); return chain; },
      lte: function (col, val) { filters.push({ op: 'lte', col: col, val: val }); return chain; },
      in: function (col, val) { filters.push({ op: 'in', col: col, val: val }); return chain; },
      order: function (col, opts) { orderBy = { col: col, asc: !(opts && opts.ascending === false) }; return chain; },
      single: function () {
        var res = runSelect();
        return Promise.resolve({ data: res.data[0] || null, error: null });
      },
      maybeSingle: function () {
        var res = runSelect();
        return Promise.resolve({ data: res.data[0] || null, error: null });
      },
      then: function (onF, onR) { return Promise.resolve(runSelect()).then(onF, onR); },
      catch: function (onR) { return Promise.resolve(runSelect()).catch(onR); },
      finally: function (onF) { return Promise.resolve(runSelect()).finally(onF); },
    };
    return chain;
  }

  function insertBuilder(tableName, payload) {
    var rows = Array.isArray(payload) ? payload : [payload];
    var inserted = rows.map(function (row) {
      var out = Object.assign({}, row);
      if (!out.id) out.id = makeId(tableName);
      if (!out.user_id && session && session.user) out.user_id = session.user.id;
      if (tableName === 'acct_reconciliation' && !out.id) out.id = makeId('recon');
      db[tableName].push(out);
      return deepClone(out);
    });
    return {
      select: function () {
        return {
          single: function () { return Promise.resolve({ data: inserted[0] || null, error: null }); },
          then: function (onF, onR) { return Promise.resolve({ data: inserted, error: null }).then(onF, onR); },
          catch: function (onR) { return Promise.resolve({ data: inserted, error: null }).catch(onR); },
          finally: function (onF) { return Promise.resolve({ data: inserted, error: null }).finally(onF); },
        };
      },
    };
  }

  function updateBuilder(tableName, patch) {
    var filters = [];
    function apply() {
      var rows = db[tableName] || [];
      var changed = [];
      rows.forEach(function (r) {
        var ok = filters.every(function (f) { return resolveComparator(f.op, r[f.col], f.val); });
        if (!ok) return;
        for (var k in patch) r[k] = patch[k];
        changed.push(deepClone(r));
      });
      return changed;
    }
    var chain = {
      eq: function (col, val) { filters.push({ op: 'eq', col: col, val: val }); return chain; },
      select: function () { return { single: function () { var c = apply(); return Promise.resolve({ data: c[0] || null, error: null }); } }; },
      then: function (onF, onR) { apply(); return Promise.resolve({ data: null, error: null }).then(onF, onR); },
      catch: function (onR) { return Promise.resolve({ data: null, error: null }).catch(onR); },
      finally: function (onF) { return Promise.resolve({ data: null, error: null }).finally(onF); },
    };
    return chain;
  }

  function deleteBuilder(tableName) {
    var filters = [];
    function apply() {
      db[tableName] = (db[tableName] || []).filter(function (r) {
        return !filters.every(function (f) { return resolveComparator(f.op, r[f.col], f.val); });
      });
    }
    var chain = {
      eq: function (col, val) { filters.push({ op: 'eq', col: col, val: val }); return chain; },
      in: function (col, val) { filters.push({ op: 'in', col: col, val: val }); return chain; },
      then: function (onF, onR) { apply(); return Promise.resolve({ error: null }).then(onF, onR); },
      catch: function (onR) { return Promise.resolve({ error: null }).catch(onR); },
      finally: function (onF) { return Promise.resolve({ error: null }).finally(onF); },
    };
    return chain;
  }

  function fromTable(tableName) {
    return {
      insert: function (payload) { return insertBuilder(tableName, payload); },
      update: function (payload) { return updateBuilder(tableName, payload); },
      delete: function () { return deleteBuilder(tableName); },
      select: function () { return selectBuilder(tableName); },
    };
  }

  window.supabase = {
    createClient: function () {
      if (window.__ACCT_E2E_NO_CLIENT__) return null;
      return {
        from: function (tableName) { return fromTable(tableName); },
        storage: {
          from: function () {
            return {
              upload: function (_path, _file) { return Promise.resolve({ error: null }); },
              createSignedUrl: function () { return Promise.resolve({ data: { signedUrl: 'https://e2e.invalid/signed' }, error: null }); },
            };
          },
        },
        channel: function () {
          return { on: function () { return { subscribe: function () { return {}; } }; } };
        },
        removeChannel: function () {},
        auth: {
          getSession: function () { return Promise.resolve({ data: { session: session }, error: null }); },
          getUser: function () { return Promise.resolve({ data: { user: session ? session.user : null }, error: null }); },
          onAuthStateChange: function (cb) {
            authListeners.push(cb);
            queueMicrotask(function () { cb('INITIAL_SESSION', session); });
            return { data: { subscription: { unsubscribe: function () {} } } };
          },
          signInWithPassword: function () { return Promise.resolve({ data: { session: session }, error: null }); },
          signUp: function () { return Promise.resolve({ data: { user: E2E_USER }, error: null }); },
          signOut: function () {
            session = null;
            fireAuth('SIGNED_OUT', null);
            return Promise.resolve({ error: null });
          },
        },
      };
    },
  };
})();
