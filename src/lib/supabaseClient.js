import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dboqsdlffilxbownkqjk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRib3FzZGxmZmlseGJvd25rcWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzUyNjMsImV4cCI6MjA2ODM1MTI2M30._sOjO6moKUs5Ch1WnrN2u4A_FnAT-dP-13a-MIgIBuQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
