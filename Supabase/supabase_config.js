// Supabase Configuration

const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

window.supabaseClient = supabaseClient;

async function signInWithEmail(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

async function getSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

function onAuthStateChanged(callback) {
  return supabaseClient.auth.onAuthStateChange(callback);
}

async function select(table, options = {}) {
  let query = supabaseClient.from(table).select(options.select || '*');
  
  if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function insert(table, row) {
  const { data, error } = await supabaseClient.from(table).insert(row).select();
  if (error) throw error;
  return data;
}

async function update(table, updates, options = {}) {
  let query = supabaseClient.from(table).update(updates);
  
  if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }
  
  const { data, error } = await query.select();
  if (error) throw error;
  return data;
}

async function remove(table, options = {}) {
  let query = supabaseClient.from(table).delete();
  
  if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }
  
  const { error } = await query;
  if (error) throw error;
}

async function rpc(functionName, params = {}) {
  const { data, error } = await supabaseClient.rpc(functionName, params);
  if (error) throw error;
  return data;
}

console.log('Supabase client initialized');
