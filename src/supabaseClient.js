import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkqpvawhqyhmffsbopza.supabase.co'
const supabaseKey = 'sb_publishable__1wbkdbwe82Kj1p5JejkQA_IyUwoQwp'

export const supabase = createClient(supabaseUrl, supabaseKey)
