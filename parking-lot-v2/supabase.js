/* Supabase client, Auth, and data-sync logic */
(function() {
  'use strict';

  let supabase = null;
  let talkAboutSubscription = null;
  let currentUserId = null; // set after auth via setCurrentUser()

  function getClient() {
    if (supabase) return supabase;
    const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    if (!url || !key || url === 'your-project-id.supabase.co' || key === 'your-anon-key-here') {
      console.warn('Supabase config missing. Add URL and anon key to config.js');
      return null;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    return supabase;
  }

  function generatePairId() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  /** Canonical post-login URL for magic links (must be allowlisted in Supabase Auth → URL Configuration). */
  function getAuthRedirectUrl() {
    let redirect = globalThis.AUTH_REDIRECT_URL;
    if (typeof redirect !== 'string' || !redirect.length) {
      redirect = typeof AUTH_REDIRECT_URL !== 'undefined' ? AUTH_REDIRECT_URL : '';
    }
    if (redirect && String(redirect).trim()) {
      return String(redirect).trim().replace(/\/$/, '');
    }
    let path = window.location.pathname.replace(/\/$/, '') || '';
    if (path.endsWith('/index.html')) path = path.replace(/\/index\.html$/, '') || '';
    return window.location.origin + path;
  }

  window.talkAbout = {
    generatePairId: generatePairId,

    // ── Auth ────────────────────────────────────────────────────────

    setCurrentUser(userId) {
      currentUserId = userId;
    },

    async getSession() {
      const client = getClient();
      if (!client) return null;
      const { data: { session } } = await client.auth.getSession();
      return session;
    },

    async signInWithOtp(email) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl()
        }
      });
      return { error };
    },

    async signOut() {
      const client = getClient();
      currentUserId = null;
      if (!client) return;
      await client.auth.signOut();
    },

    onAuthStateChange(callback) {
      const client = getClient();
      if (!client) return () => {};
      const { data: { subscription } } = client.auth.onAuthStateChange(callback);
      return () => subscription.unsubscribe();
    },

    // ── User profiles ────────────────────────────────────────────────

    async getUserProfile(userId) {
      const client = getClient();
      if (!client) return null;
      const { data, error } = await client.from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return error ? null : data;
    },

    async saveUserProfile(userId, { displayName, pairId }) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('user_profiles').upsert({
        user_id: userId,
        display_name: displayName || '',
        pair_id: pairId || null
      }, { onConflict: 'user_id' });
      return { error };
    },

    // Claim existing device_preferences rows for the current auth user
    // Called after login when the user already has a deviceSyncId in localStorage
    async claimDevicePreferences(deviceSyncId) {
      if (!currentUserId) return;
      const client = getClient();
      if (!client) return;
      await client.from('device_preferences')
        .update({ user_id: currentUserId })
        .eq('device_sync_id', deviceSyncId)
        .is('user_id', null);
    },

    // ── Pair / talk-about ────────────────────────────────────────────

    async addTalkAbout(pairId, text, addedBy) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { data, error } = await client.from('talk_about').insert({
        pair_id: pairId,
        text: text.trim(),
        added_by: addedBy,
        resolved: false
      }).select().single();
      return { data, error };
    },

    async resolveTalkAbout(id) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('talk_about').update({ resolved: true }).eq('id', id);
      return { error };
    },

    async getUserPreferences(pairId, addedBy) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { data, error } = await client.from('user_preferences')
        .select('column_colors')
        .eq('pair_id', pairId)
        .eq('added_by', addedBy)
        .maybeSingle();
      if (error) return { error: error.message };
      return data?.column_colors || {};
    },

    async saveUserPreferences(pairId, addedBy, columnColors) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const row = {
        pair_id: pairId,
        added_by: addedBy,
        column_colors: columnColors
      };
      if (currentUserId) row.user_id = currentUserId;
      const { error } = await client.from('user_preferences').upsert(row, { onConflict: 'pair_id,added_by' });
      return { error };
    },

    subscribeUserPreferences(pairId, addedBy, callback) {
      const client = getClient();
      if (!client) return () => {};
      const channel = client.channel('user_prefs_' + pairId + '_' + (addedBy || 'all'))
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_preferences',
          filter: 'pair_id=eq.' + pairId
        }, async () => {
          const prefs = await client.from('user_preferences')
            .select('column_colors')
            .eq('pair_id', pairId)
            .eq('added_by', addedBy)
            .maybeSingle();
          if (prefs?.data?.column_colors && typeof callback === 'function') {
            callback(prefs.data.column_colors);
          }
        })
        .subscribe();
      return () => client.removeChannel(channel);
    },

    async getDevicePreferences(deviceSyncId) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { data, error } = await client.from('device_preferences')
        .select('preferences')
        .eq('device_sync_id', deviceSyncId)
        .maybeSingle();
      if (error) return { error: error.message };
      return data?.preferences || {};
    },

    async saveDevicePreferences(deviceSyncId, preferences) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const row = {
        device_sync_id: deviceSyncId,
        preferences: preferences || {},
        updated_at: new Date().toISOString()
      };
      if (currentUserId) row.user_id = currentUserId;
      const { error } = await client.from('device_preferences').upsert(row, { onConflict: 'device_sync_id' });
      return { error };
    },

    subscribeDevicePreferences(deviceSyncId, callback) {
      const client = getClient();
      if (!client) return () => {};
      const channel = client.channel('device_prefs_' + deviceSyncId)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'device_preferences',
          filter: 'device_sync_id=eq.' + deviceSyncId
        }, async () => {
          const prefs = await client.from('device_preferences')
            .select('preferences')
            .eq('device_sync_id', deviceSyncId)
            .maybeSingle();
          if (prefs?.data?.preferences && typeof callback === 'function') {
            callback(prefs.data.preferences);
          }
        })
        .subscribe();
      return () => client.removeChannel(channel);
    },

    subscribeTalkAbout(pairId, callback) {
      const client = getClient();
      if (!client) {
        callback([]);
        return () => {};
      }
      const fetchAndCallback = async () => {
        const { data, error } = await client.from('talk_about')
          .select('*')
          .eq('pair_id', pairId)
          .eq('resolved', false)
          .order('created_at', { ascending: true });
        callback(error ? [] : (data || []));
      };
      fetchAndCallback();
      talkAboutSubscription = client.channel('talk_about_' + pairId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'talk_about', filter: 'pair_id=eq.' + pairId }, () => {
          fetchAndCallback();
        })
        .subscribe();
      return () => {
        if (talkAboutSubscription) {
          client.removeChannel(talkAboutSubscription);
          talkAboutSubscription = null;
        }
      };
    },

    // ── Email triage ─────────────────────────────────────────────────

    async getEmailTasks(pairId, addedBy) {
      const client = getClient();
      if (!client) return { data: [], error: 'Supabase not configured' };
      let q = client.from('email_tasks')
        .select('*')
        .eq('pair_id', pairId)
        .eq('approved', false);
      if (addedBy) q = q.eq('added_by', addedBy);
      const { data, error } = await q.order('added_at', { ascending: false });
      return { data: error ? [] : (data || []), error };
    },

    async approveEmailTask(id) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('email_tasks').update({ approved: true }).eq('id', id);
      return { error };
    },

    async deleteEmailTask(id) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('email_tasks').delete().eq('id', id);
      return { error };
    },

    async getLastAgentRun(pairId, addedBy) {
      const client = getClient();
      if (!client) return null;
      let q = client.from('agent_runs')
        .select('run_at, status, emails_processed, tasks_created, error_message')
        .eq('pair_id', pairId);
      if (addedBy) q = q.eq('added_by', addedBy);
      const { data, error } = await q.order('run_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return error ? null : data;
    },

    async requestTriageRun(pairId, addedBy) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('triage_run_requests').insert({
        pair_id: pairId,
        added_by: addedBy || null
      });
      return { error };
    },

    // ── Push & reminders ─────────────────────────────────────────────

    async savePushSubscription(deviceSyncId, subscription) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const sub = subscription.toJSON ? subscription.toJSON() : subscription;
      const row = {
        device_sync_id: deviceSyncId,
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth
      };
      if (currentUserId) row.user_id = currentUserId;
      const { error } = await client.from('push_subscriptions').upsert(row, { onConflict: 'device_sync_id,endpoint' });
      return { error };
    },

    async deletePushSubscription(deviceSyncId, endpoint) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('push_subscriptions')
        .delete()
        .eq('device_sync_id', deviceSyncId)
        .eq('endpoint', endpoint);
      return { error };
    },

    async addReminder(deviceSyncId, itemId, itemText, remindAt) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const row = {
        device_sync_id: deviceSyncId,
        item_id: itemId,
        item_text: (itemText || '').slice(0, 500),
        remind_at: new Date(remindAt).toISOString()
      };
      if (currentUserId) row.user_id = currentUserId;
      const { error } = await client.from('reminders').insert(row);
      return { error };
    },

    async removeReminder(deviceSyncId, itemId) {
      const client = getClient();
      if (!client) return { error: 'Supabase not configured' };
      const { error } = await client.from('reminders')
        .delete()
        .eq('device_sync_id', deviceSyncId)
        .eq('item_id', itemId);
      return { error };
    },

    subscribeEmailTasks(pairId, addedBy, callback) {
      const client = getClient();
      if (!client) {
        callback([]);
        return () => {};
      }
      const fetchAndCallback = async () => {
        try {
          let q = client.from('email_tasks')
            .select('*')
            .eq('pair_id', pairId)
            .eq('approved', false);
          if (addedBy) q = q.eq('added_by', addedBy);
          const { data, error } = await q.order('added_at', { ascending: false });
          callback(error ? [] : (data || []));
        } catch (e) {
          callback([]);
        }
      };
      fetchAndCallback();
      const channel = client.channel('email_tasks_' + pairId + '_' + (addedBy || 'all'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'email_tasks', filter: 'pair_id=eq.' + pairId }, fetchAndCallback)
        .subscribe();
      return () => client.removeChannel(channel);
    }
  };
})();
