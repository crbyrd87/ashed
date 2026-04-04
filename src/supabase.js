import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://spirqhzjzjsckgfimxbx.supabase.co'
const supabaseKey = 'sb_publishable_zlnHBRT0hN-Am8sfxUnNlw_X4MiTmrU'

export const supabase = createClient(supabaseUrl, supabaseKey)