/* Supabase client and Talk about sync logic */
(function() {
  'use strict';

  let supabase = null;
  let talkAboutSubscription = null;

  function getClient() {
    if (supabase) return supabase;
    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
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
      if (!client) return {};
      const { data, error } = await client.from('user_preferences')
        .select('column_colors')
        .eq('pair_id', pairId)
        .eq('added_by', addedBy)
        .maybeSingle();
      if (error || !data) return {};
      return data.column_colors || {};
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
    }
  };
})();
