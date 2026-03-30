/**
 * Minimal Supabase client shape for Ledger E2E (no network).
 * Loaded in place of the CDN bundle by e2e/server.mjs.
 */
(function () {
  'use strict';

  var E2E_USER = { id: '00000000-0000-0000-0000-0000000000e1', email: 'e2e@ledger.test' };
  var session = { user: E2E_USER, access_token: 'e2e-token' };
  var authListeners = [];

  function fireAuth(evt, sess) {
    authListeners.forEach(function (cb) {
      try {
        cb(evt, sess);
      } catch (_e) {}
    });
  }

  function resolveInserts(payload) {
    var rows = Array.isArray(payload) ? payload : [payload];
    return rows.map(function (r, i) {
      var o = {};
      for (var k in r) o[k] = r[k];
      if (!o.id) o.id = 'e2e-ins-' + i;
      return o;
    });
  }

  function insertChain(payload) {
    return {
      select: function () {
        var data = resolveInserts(payload);
        var p = Promise.resolve({ data: data, error: null });
        return {
          single: function () {
            return Promise.resolve({ data: data[0] || {}, error: null });
          },
          then: p.then.bind(p),
          catch: p.catch.bind(p),
          finally: p.finally.bind(p),
        };
      },
    };
  }

  /** After .update().eq().eq(…) — either await (bank) or .select().single() (rows). */
  function afterTwoEqs() {
    return {
      select: function () {
        return {
          single: function () {
            return Promise.resolve({ data: {}, error: null });
          },
        };
      },
      then: function (onF, onR) {
        return Promise.resolve({ data: null, error: null }).then(onF, onR);
      },
      catch: function (r) {
        return Promise.resolve({ data: null, error: null }).catch(r);
      },
      finally: function (f) {
        return Promise.resolve({ data: null, error: null }).finally(f);
      },
    };
  }

  function updateChain() {
    return {
      eq: function () {
        return {
          eq: function () {
            return afterTwoEqs();
          },
        };
      },
    };
  }

  function deleteChain() {
    return {
      eq: function () {
        return {
          eq: function () {
            return Promise.resolve({ error: null });
          },
        };
      },
    };
  }

  /** Seeded rows so Reports Apply can assert non-zero totals in E2E. */
  var E2E_INCOME_RANGE = {
    data: [
      {
        id: 'e2e-income-1',
        date: '2024-06-15',
        amount_cents: 10000,
        gst_cents: 500,
        income_type: 'gig',
        vendor: 'Client A',
        client_or_project: '',
        note: '',
      },
    ],
    error: null,
  };
  var E2E_EXPENSE_RANGE = {
    data: [
      {
        id: 'e2e-exp-1',
        date: '2024-06-10',
        amount_cents: 2500,
        gst_cents: 0,
        category: '8810',
        vendor: 'Vendor B',
        note: '',
        total_payment_cents: null,
      },
    ],
    error: null,
  };

  function createSelectChain(tableName) {
    var empty = { data: [], error: null };
    var base = Promise.resolve(empty);
    var plannedOrderPass = 0;
    var chain = {
      eq: function () {
        return chain;
      },
      is: function () {
        return chain;
      },
      gte: function () {
        return chain;
      },
      lte: function () {
        return chain;
      },
      in: function () {
        return chain;
      },
      order: function () {
        if (tableName === 'acct_planned') {
          plannedOrderPass++;
          return plannedOrderPass >= 2 ? Promise.resolve(empty) : chain;
        }
        if (tableName === 'acct_income') return Promise.resolve(E2E_INCOME_RANGE);
        if (tableName === 'acct_expenses') return Promise.resolve(E2E_EXPENSE_RANGE);
        return Promise.resolve(empty);
      },
      single: function () {
        return Promise.resolve({ data: null, error: null });
      },
      maybeSingle: function () {
        return Promise.resolve({ data: null, error: null });
      },
      then: base.then.bind(base),
      catch: base.catch.bind(base),
      finally: base.finally.bind(base),
    };
    return chain;
  }

  function fromTable(tableName) {
    return {
      insert: insertChain,
      update: function () {
        return updateChain();
      },
      delete: function () {
        return deleteChain();
      },
      select: function () {
        return createSelectChain(tableName || '');
      },
    };
  }

  window.supabase = {
    createClient: function () {
      if (window.__ACCT_E2E_NO_CLIENT__) {
        return null;
      }
      return {
        from: function (tableName) {
          return fromTable(tableName);
        },
        storage: {
          from: function () {
            return {
              upload: function () {
                return Promise.resolve({ error: null });
              },
              createSignedUrl: function () {
                return Promise.resolve({
                  data: { signedUrl: 'https://e2e.invalid/signed' },
                  error: null,
                });
              },
            };
          },
        },
        channel: function () {
          return { on: function () {
            return { subscribe: function () {
              return {};
            } };
          } };
        },
        removeChannel: function () {},
        auth: {
          getSession: function () {
            return Promise.resolve({ data: { session: session }, error: null });
          },
          getUser: function () {
            return Promise.resolve({
              data: { user: session ? session.user : null },
              error: null,
            });
          },
          onAuthStateChange: function (cb) {
            authListeners.push(cb);
            queueMicrotask(function () {
              cb('INITIAL_SESSION', session);
            });
            return {
              data: {
                subscription: {
                  unsubscribe: function () {},
                },
              },
            };
          },
          signInWithPassword: function () {
            return Promise.resolve({ data: { session: session }, error: null });
          },
          signUp: function () {
            return Promise.resolve({ data: { user: E2E_USER }, error: null });
          },
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
