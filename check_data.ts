import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zjolverwdprycnlqtdnf.supabase.co";
const supabaseKey = "sb_publishable_63CNJRRbEab7-GLT6BBx4w_issOcPZX";

async function checkData() {
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('--- User Roles ---')
    const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*')
    console.log(rolesError || roles)

    console.log('--- Provider Profiles ---')
    const { data: providers, error: provError } = await supabase.from('provider_profiles').select('*')
    console.log(provError || providers)

    console.log('--- Jobs ---')
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('id, provider_id, company, title').limit(5)
    console.log(jobsError || jobs)

    console.log('--- Job Applications ---')
    const { data: apps, error: appsError } = await supabase.from('job_applications').select('*').limit(5)
    console.log(appsError || apps)

    console.log('--- Profiles ---')
    const { data: profiles, error: profError } = await supabase.from('profiles').select('id, full_name, skills').limit(5)
    console.log(profError || profiles)
}

checkData()
