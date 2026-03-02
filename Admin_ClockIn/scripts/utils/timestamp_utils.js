function parseDatabaseTimestamp(timestamp) {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) return timestamp;
  
  const timestampStr = String(timestamp);
  
  const hasTimezone = /[+-]\d{2}:?\d{2}$/.test(timestampStr);
  
  if (hasTimezone) {
    const dateTimePart = timestampStr.replace(/[+-]\d{2}:?\d{2}$/, '');
    
    const localTimestamp = dateTimePart.replace('T', ' ');
    
    const [datePart, timePart] = localTimestamp.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
  } else {
    return new Date(timestampStr.replace('T', ' '));
  }
}

function formatTimeFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeFromDB24(timestamp) {
  if (!timestamp) return '';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('en-US', { hour12: false }).split(' ')[0];
}

function getDateFromDB(timestamp) {
  if (!timestamp) return null;
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return null;
  
  return date.toISOString().split('T')[0];
}

function formatDateFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTimeFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
}

window.timestampUtils = {
  parseDatabaseTimestamp,
  formatTimeFromDB,
  formatTimeFromDB24,
  getDateFromDB,
  formatDateFromDB,
  formatDateTimeFromDB
};
