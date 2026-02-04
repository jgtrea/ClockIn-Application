// Setup script to create initial admin and employee users
// Run this script to initialize the database with test users

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('Checking table structure...');
  
  try {
    // Get admin table structure
    const { data: adminData, error: adminError } = await supabase
      .from('user_admin_data')
      .select('*')
      .limit(1);
    
    if (!adminError && adminData) {
      console.log('user_admin_data columns:', Object.keys(adminData[0] || {}));
    }

    // Get employee table structure
    const { data: empData, error: empError } = await supabase
      .from('user_employee_data')
      .select('*')
      .limit(1);
    
    if (!empError && empData) {
      console.log('user_employee_data columns:', Object.keys(empData[0] || {}));
    }
  } catch (err) {
    console.error('Error checking structure:', err);
  }
}

async function setupInitialUsers() {
  await checkTableStructure();
  
  console.log('\nSetting up initial users...');

  try {
    // Create admin user - use only basic fields
    const { data: adminData, error: adminError } = await supabase
      .from('user_admin_data')
      .insert({
        email: 'admin@clockin.com',
        pass: 'admin123'
      })
      .select();

    if (adminError) {
      console.error('Error creating admin:', adminError);
    } else {
      console.log('Admin user created:', adminData);
    }

    // Create test employee users - use only basic fields
    const employees = [
      {
        email: 'john.doe@clockin.com',
        pass: 'password123',
        name: 'John Doe'
      },
      {
        email: 'jane.smith@clockin.com',
        pass: 'password123',
        name: 'Jane Smith'
      },
      {
        email: 'bob.wilson@clockin.com',
        pass: 'password123',
        name: 'Bob Wilson'
      }
    ];

    const { data: empData, error: empError } = await supabase
      .from('user_employee_data')
      .insert(employees)
      .select();

    if (empError) {
      console.error('Error creating employees:', empError);
    } else {
      console.log('Employee users created:', empData);
    }

    console.log('\n=== Login Credentials ===');
    console.log('Admin Login:');
    console.log('  Email: admin@clockin.com');
    console.log('  Password: admin123');
    console.log('\nEmployee Login:');
    console.log('  Email: john.doe@clockin.com');
    console.log('  Password: password123');
    console.log('\n  Email: jane.smith@clockin.com');
    console.log('  Password: password123');
    console.log('\n  Email: bob.wilson@clockin.com');
    console.log('  Password: password123');

  } catch (err) {
    console.error('Setup error:', err);
  }
}

setupInitialUsers();
