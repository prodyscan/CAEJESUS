import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log("BODY:", JSON.stringify(body))

    const { nom, email, password, class_id } = body

    if (!nom || !email || !password || !class_id) {
      console.error("Champs manquants", body)
      return new Response(
        JSON.stringify({
          error: "Champs manquants",
          details: "nom, email, password, class_id sont obligatoires",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    console.log("HAS_URL:", !!supabaseUrl)
    console.log("HAS_SERVICE_ROLE:", !!serviceRoleKey)

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Secrets manquants")
      return new Response(
        JSON.stringify({
          error: "Secrets manquants",
          details: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (userError) {
      console.error("USER ERROR:", userError.message)
      return new Response(
        JSON.stringify({
          error: "Erreur création utilisateur",
          details: userError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log("USER CREATED:", userData.user.id)

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert([
        {
          id: userData.user.id,
          nom,
          role: "assistant",
          class_id,
        },
      ])

    if (profileError) {
      console.error("PROFILE ERROR:", profileError.message)
      return new Response(
        JSON.stringify({
          error: "Erreur insertion profile",
          details: profileError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    console.log("PROFILE CREATED OK")

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (err) {
    console.error("CATCH ERROR:", String(err))
    return new Response(
      JSON.stringify({
        error: "Erreur serveur",
        details: String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
