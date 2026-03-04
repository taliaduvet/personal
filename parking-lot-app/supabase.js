/* Supabase client and Talk about sync logic */
(function() {
  'use strict';

  let supabase = null;
  let talkAboutSubscription = null;

  function getClient() {
    if (supabase) return supabase;
    const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';
    if (!url || !key || url === 'your-project-id.supabase.co' || key === 'your-anon-key-here') {
      console.warn('Supabase config missing. Add URL and anon key to config.js');
      return null;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  }

  function generatePairId() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  window.talkAbout = {
    generatePairId: generatePairId,

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
      const { error } = await client.from('user_preferences').upsert({
        pair_id: pairId,
        added_by: addedBy,
        column_colors: columnColors
      }, { onConflict: 'pair_id,added_by' });
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
      const { error } = await client.from('device_preferences').upsert({
        device_sync_id: deviceSyncId,
        preferences: preferences || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'device_sync_id' });
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
