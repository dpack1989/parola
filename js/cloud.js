"use strict";

(() => {
  const SUPABASE_URL = "https://uobxilbvszqpelnfvyyt.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GrhAhpt97wjfdIwNuEqfwg_tSrvHDuB";

  if (!window.supabase?.createClient) {
    window.ParolaCloud = { available: false };
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storageKey: "parola-cloud-auth-v1",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  function redirectUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  window.ParolaCloud = {
    available: true,

    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    onAuthStateChange(callback) {
      return client.auth.onAuthStateChange((event, session) => callback(event, session));
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl() }
      });
      if (error) throw error;
      return data;
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },

    async pullState(userId) {
      const { data, error } = await client
        .from("parola_state")
        .select("payload, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async pushState(userId, payload) {
      const { data, error } = await client
        .from("parola_state")
        .upsert({ user_id: userId, payload }, { onConflict: "user_id" })
        .select("updated_at")
        .single();
      if (error) throw error;
      return data;
    }
  };
})();
