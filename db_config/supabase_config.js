const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

// Service role key for admin operations
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEwNzU3NCwiZXhwIjoyMDg1NjgzNTc0fQ.DNlCv_it_Kn938Zzl3wQJ6kaE9I5WJsL5R8rmqaRSS0';

// Create admin client with service role key for privileged operations
let supabaseAdmin = null;

function initAdminClient() {
  if (supabaseAdmin) return supabaseAdmin;
  
  if (typeof supabase !== 'undefined') {
    const { createClient } = supabase;
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    window.supabaseAdmin = supabaseAdmin;
    window.initAdminClient = initAdminClient;
  } else {
    console.error('Supabase library not available yet');
  }
  return supabaseAdmin;
}

// Use existing client from parent if available (to avoid duplicate instances in iframe)
let supabaseClient;
if (window.parent && window.parent.window.supabaseClient) {
  supabaseClient = window.parent.window.supabaseClient;
} else if (window.supabaseClient) {
  supabaseClient = window.supabaseClient;
} else {
  const { createClient } = supabase;
  supabaseClient = createClient(supabaseUrl, supabaseKey);
}

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

// Delete user from auth
async function deleteUserFromAuth(email) {
  try {
    const adminClient = initAdminClient();
    if (!adminClient) {
      console.error('Admin client not available');
      return { success: false, error: 'Admin client not available' };
    }
    
    // Get user by email
    const { data: authData, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      return { success: false, error: listError };
    }
    
    const authUser = authData.users.find(u => u.email === email);
    if (!authUser) {
      console.log('User not found in auth, skipping');
      return { success: true, message: 'User not in auth' };
    }
    
    // Delete user from auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUser.id);
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return { success: false, error: deleteError };
    }
    
    return { success: true };
  } catch (err) {
    console.error('Auth deletion error:', err);
    return { success: false, error: err };
  }
}

window.deleteUserFromAuth = deleteUserFromAuth;

// Create user in authentication
async function createUserInAuth(email, password) {
  console.log('createUserInAuth called with:', email);
  try {
    const adminClient = initAdminClient();
    console.log('Admin client:', adminClient);
    if (!adminClient) {
      console.error('Admin client not available');
      return { success: false, error: 'Admin client not available' };
    }
    
    // Create user in auth
    console.log('Calling createUser with password length:', password ? password.length : 0);
    const { data, error } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });
    
    console.log('Create user response - data:', data, 'error:', error);
    if (error) {
      console.error('Error creating user in auth:', error);
      return { success: false, error: error };
    }
    
    console.log('User created in auth:', data);
    return { success: true, data: data };
  } catch (err) {
    console.error('Auth creation error:', err);
    return { success: false, error: err };
  }
}

window.createUserInAuth = createUserInAuth;
