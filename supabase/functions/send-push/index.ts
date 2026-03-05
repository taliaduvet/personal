// Send push notifications for due reminders
// Deploy: supabase functions deploy send-push
// Set secret: supabase secrets set VAPID_PRIVATE_KEY='{"kty":"EC","crv":"P-256","x":"...","y":"...","d":"..."}'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushHTTPRequest } from "npm:@pushforge/builder@2.0.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!vapidPrivateKey) {
    console.error("VAPID_PRIVATE_KEY not set");
    return new Response(
      JSON.stringify({ error: "Push not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let privateJWK: object;
  try {
    privateJWK = typeof vapidPrivateKey === "string" ? JSON.parse(vapidPrivateKey) : vapidPrivateKey;
  } catch (e) {
    console.error("Invalid VAPID_PRIVATE_KEY JSON:", e);
    return new Response(
      JSON.stringify({ error: "Invalid VAPID key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    const { data: dueReminders, error: remindersError } = await client
      .from("reminders")
      .select("id, device_sync_id, item_id, item_text, remind_at")
      .lte("remind_at", now);

    if (remindersError) {
      console.error("Reminders query error:", remindersError);
      return new Response(
        JSON.stringify({ error: remindersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reminders: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceIds = [...new Set(dueReminders.map((r) => r.device_sync_id))];
    const { data: subs, error: subsError } = await client
      .from("push_subscriptions")
      .select("device_sync_id, endpoint, p256dh, auth")
      .in("device_sync_id", deviceIds);

    if (subsError || !subs || subs.length === 0) {
      await client.from("reminders").delete().in("id", dueReminders.map((r) => r.id));
      return new Response(
        JSON.stringify({ sent: 0, reminders: dueReminders.length, deleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subsByDevice = new Map<string, typeof subs>();
    for (const s of subs) {
      if (!subsByDevice.has(s.device_sync_id)) subsByDevice.set(s.device_sync_id, []);
      subsByDevice.get(s.device_sync_id)!.push(s);
    }

    let sent = 0;
    const failedEndpoints = new Set<string>();

    for (const reminder of dueReminders) {
      const deviceSubs = subsByDevice.get(reminder.device_sync_id) || [];
      const payload = {
        title: "Parking Lot",
        body: reminder.item_text.slice(0, 100),
        url: "/",
        itemId: reminder.item_id,
      };

      for (const sub of deviceSubs) {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          };
          const { endpoint, headers, body } = await buildPushHTTPRequest({
            privateJWK,
            subscription,
            message: {
              payload,
              adminContact: "mailto:support@example.com",
            },
          });

          const res = await fetch(endpoint, {
            method: "POST",
            headers: Object.fromEntries(headers.entries()),
            body,
          });

          if (res.ok || res.status === 201) {
            sent++;
          } else {
            const text = await res.text();
            if (res.status === 404 || res.status === 410 || res.status === 400) {
              failedEndpoints.add(sub.endpoint);
            }
            console.warn("Push failed", res.status, text);
          }
        } catch (e) {
          console.warn("Push error:", e);
        }
      }
    }

    if (failedEndpoints.size > 0) {
      await client
        .from("push_subscriptions")
        .delete()
        .in("endpoint", [...failedEndpoints]);
    }

    await client.from("reminders").delete().in("id", dueReminders.map((r) => r.id));

    return new Response(
      JSON.stringify({ sent, reminders: dueReminders.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
