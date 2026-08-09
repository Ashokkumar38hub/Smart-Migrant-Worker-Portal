import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zjolverwdprycnlqtdnf.supabase.co";
const supabaseKey = "sb_publishable_63CNJRRbEab7-GLT6BBx4w_issOcPZX";

async function checkRoles() {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: roles, error } = await supabase.from('user_roles').select('*')
    if (error) console.error('Error fetching roles:', error)
    else console.log('User Roles:', roles)

    const { data: users, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) console.error('Error fetching users:', userError)
    else console.log('Users:', users.users.map(u => ({ id: u.id, email: u.email })))
}

checkRoles()
