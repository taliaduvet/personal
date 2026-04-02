(function () {
  'use strict';

  let client = null;

  function getClient() {
    if (client) return client;
    const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    if (!url || !key) {
      console.warn('Supabase config missing or empty. Check config.js SUPABASE_URL and SUPABASE_ANON_KEY.');
      return null;
    }
    client = window.supabase.createClient(url, key);
    return client;
  }

  async function getUid() {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    return user?.id ?? null;
  }

  window.acctApi = {
    getClient,
    getUid,

    async signUp(email, password) {
      const sb = getClient();
      if (!sb) return { error: { message: 'Supabase not configured – check config.js SUPABASE_URL and SUPABASE_ANON_KEY.' } };
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) console.error('Supabase signUp error', error);
      return { data, error };
    },

    async signIn(email, password) {
      const sb = getClient();
      if (!sb) return { error: { message: 'Supabase not configured – check config.js SUPABASE_URL and SUPABASE_ANON_KEY.' } };
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) console.error('Supabase signIn error', error);
      return { data, error };
    },

    async signOut() {
      const sb = getClient();
      if (!sb) return { error: 'Supabase not configured' };
      await sb.auth.signOut();
      return { error: null };
    },

    onAuthChange(cb) {
      const sb = getClient();
      if (!sb) return () => {};
      const { data: { subscription } } = sb.auth.onAuthStateChange(cb);
      return () => subscription.unsubscribe();
    },

    // --- Income
    async incomeList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_income').select('*').eq('user_id', u).order('date', { ascending: false });
      return { data: data || [], error };
    },

    async incomeInsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_income').insert({ ...row, user_id: u }).select().single();
      return { data, error };
    },

    async incomeUpdate(id, row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_income').update(row).eq('id', id).eq('user_id', u).select().single();
      return { data, error };
    },

    async incomeDelete(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb.from('acct_income').delete().eq('id', id).eq('user_id', u);
      return { error };
    },

    // --- Expenses
    async expensesList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_expenses').select('*').eq('user_id', u).order('date', { ascending: false });
      return { data: data || [], error };
    },

    async expensesInsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_expenses').insert({ ...row, user_id: u }).select().single();
      return { data, error };
    },

    async expensesUpdate(id, row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_expenses').update(row).eq('id', id).eq('user_id', u).select().single();
      return { data, error };
    },

    async expensesDelete(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb.from('acct_expenses').delete().eq('id', id).eq('user_id', u);
      return { error };
    },

    // --- Reports (client can filter by date; here we just expose list, or add a simple range query)
    async incomeInRange(fromDate, toDate) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      let q = sb.from('acct_income').select('*').eq('user_id', u).gte('date', fromDate).lte('date', toDate).order('date', { ascending: false });
      const { data, error } = await q;
      return { data: data || [], error };
    },

    async expensesInRange(fromDate, toDate) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_expenses').select('*').eq('user_id', u).gte('date', fromDate).lte('date', toDate).order('date', { ascending: false });
      return { data: data || [], error };
    },

    // --- Planned (budget) income/expenses
    async plannedList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_planned').select('*').eq('user_id', u).order('type').order('label');
      return { data: data || [], error };
    },

    async plannedInsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_planned').insert({ ...row, user_id: u }).select().single();
      return { data, error };
    },

    async plannedUpdate(id, row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('acct_planned').update(row).eq('id', id).eq('user_id', u).select().single();
      return { data, error };
    },

    async plannedDelete(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb.from('acct_planned').delete().eq('id', id).eq('user_id', u);
      return { error };
    },

    // --- Bank transactions & reconciliation
    async bankInsertMany(rows) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      if (!rows.length) return { data: [], error: null };
      const toInsert = rows.map(r => ({ ...r, user_id: u }));
      const { data, error } = await sb.from('acct_bank_transactions').insert(toInsert).select();
      return { data: data || [], error };
    },

    /** Returns minimal fields for duplicate detection: date, description, amount_cents (all existing tx for this user). */
    async bankListKeysForDedup() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb
        .from('acct_bank_transactions')
        .select('date,description,amount_cents')
        .eq('user_id', u);
      return { data: data || [], error };
    },

    async bankListUnreconciled() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb
        .from('acct_bank_transactions')
        .select('id,date,description,amount_cents,source_file_name,ignored_at,acct_reconciliation (id,income_id,expense_id)')
        .eq('user_id', u)
        .is('ignored_at', null)
        .order('date', { ascending: false });
      return { data: data || [], error };
    },

    async bankMarkIgnored(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb
        .from('acct_bank_transactions')
        .update({ ignored_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', u);
      return { error };
    },

    async bankDeleteMany(ids) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const list = (ids || []).filter(Boolean);
      if (!list.length) return { error: null };
      const { error } = await sb
        .from('acct_bank_transactions')
        .delete()
        .eq('user_id', u)
        .in('id', list);
      return { error };
    },

    async createReconciliation(bankTransactionId, incomeId, expenseId) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const payload = { bank_transaction_id: bankTransactionId };
      if (incomeId) payload.income_id = incomeId;
      if (expenseId) payload.expense_id = expenseId;
      const { data, error } = await sb.from('acct_reconciliation').insert(payload).select().single();
      return { data, error };
    },

    // --- Categorization rules (for bank tx suggestions)
    async rulesList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb
        .from('acct_categorization_rules')
        .select('*')
        .eq('user_id', u)
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    },

    async rulesInsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb
        .from('acct_categorization_rules')
        .insert({ ...row, user_id: u })
        .select()
        .single();
      return { data, error };
    },

    // --- Receipts (Storage + metadata)
    async listReceipts(expenseId) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb
        .from('acct_receipts')
        .select('*')
        .eq('expense_id', expenseId)
        .order('uploaded_at', { ascending: false });
      return { data: data || [], error };
    },

    async uploadReceipt(expenseId, file) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `${u}/${expenseId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await sb.storage.from('acct_receipts').upload(path, file);
      if (uploadError) return { error: uploadError };
      const { data, error } = await sb
        .from('acct_receipts')
        .insert({ expense_id: expenseId, file_path: path, file_name: file.name })
        .select()
        .single();
      return { data, error };
    },

    async getReceiptUrl(filePath) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.storage
        .from('acct_receipts')
        .createSignedUrl(filePath, 60 * 10);
      if (error) return { error };
      return { url: data.signedUrl, error: null };
    }
  };

  // --- Gluten-free medical expense (gf_products, gf_receipts, gf_purchases)
  window.gfApi = {
    async productsList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('gf_products').select('*').eq('user_id', u).order('name');
      return { data: data || [], error };
    },

    async productUpsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const payload = { ...row, user_id: u, updated_at: new Date().toISOString() };
      if (row.id) {
        const { data, error } = await sb.from('gf_products').update(payload).eq('id', row.id).eq('user_id', u).select().single();
        return { data, error };
      }
      delete payload.id;
      const { data, error } = await sb.from('gf_products').insert(payload).select().single();
      return { data, error };
    },

    async productDelete(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb.from('gf_products').delete().eq('id', id).eq('user_id', u);
      return { error };
    },

    async purchasesList(opts) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      let q = sb.from('gf_purchases').select('*').eq('user_id', u).order('purchase_date', { ascending: false });
      if (opts && opts.from) q = q.gte('purchase_date', opts.from);
      if (opts && opts.to) q = q.lte('purchase_date', opts.to);
      const { data, error } = await q;
      return { data: data || [], error };
    },

    async purchaseInsert(row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('gf_purchases').insert({ ...row, user_id: u }).select().single();
      return { data, error };
    },

    async purchaseUpdate(id, row) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('gf_purchases').update(row).eq('id', id).eq('user_id', u).select().single();
      return { data, error };
    },

    async purchaseDelete(id) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { error } = await sb.from('gf_purchases').delete().eq('id', id).eq('user_id', u);
      return { error };
    },

    async gfReceiptsList() {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const { data, error } = await sb.from('gf_receipts').select('*').eq('user_id', u).order('uploaded_at', { ascending: false });
      return { data: data || [], error };
    },

    /** Load receipt rows for export (by primary key, scoped to user). */
    async gfReceiptsByIds(ids) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { data: [], error: 'Not authenticated' };
      const list = (ids || []).filter(Boolean);
      if (list.length === 0) return { data: [], error: null };
      const { data, error } = await sb.from('gf_receipts').select('*').eq('user_id', u).in('id', list);
      return { data: data || [], error };
    },

    async gfReceiptUpload(file, receiptDate) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const receiptId = crypto.randomUUID();
      const path = `${u}/gf/${receiptId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await sb.storage.from('acct_receipts').upload(path, file);
      if (uploadError) return { error: uploadError };
      const { data, error } = await sb.from('gf_receipts').insert({
        user_id: u,
        file_path: path,
        file_name: file.name,
        receipt_date: receiptDate || null
      }).select().single();
      return { data, error };
    },

    async gfReceiptUpdate(id, payload) {
      const sb = getClient();
      const u = await getUid();
      if (!sb || !u) return { error: 'Not authenticated' };
      const { data, error } = await sb.from('gf_receipts').update(payload).eq('id', id).eq('user_id', u).select().single();
      return { data, error };
    },

    async getGfReceiptUrl(filePath) {
      return window.acctApi.getReceiptUrl(filePath);
    }
  };
})();
