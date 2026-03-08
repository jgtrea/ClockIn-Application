// Common Export Data Utilities
// This file contains reusable functions for exporting data to CSV and JSON formats

/**
 * Download a file to the user's device
 * @param {string} content - The content to download
 * @param {string} filename - The filename for the download
 * @param {string} mimeType - The MIME type for the file
 */
window.exportUtils = {
  downloadFile: function(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Export data to CSV format
   * @param {Array} data - Array of objects to export
   * @param {Array} headers - Array of header labels
   * @param {Array} fields - Array of field names corresponding to headers
   * @param {string} filename - The filename for the download
   */
  exportToCSV: function(data, headers, fields, filename = 'export.csv') {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const rows = [headers.join(',')];

    data.forEach(item => {
      const row = fields.map(field => {
        let value = item[field] || '';
        // Handle commas in values by wrapping in quotes
        if (String(value).includes(',')) {
          value = `"${value}"`;
        }
        return value;
      });
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  },

  /**
   * Export data to JSON format
   * @param {Array} data - Array of objects to export
   * @param {string} filename - The filename for the download
   */
  exportToJSON: function(data, filename = 'export.json') {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  },

  /**
   * Create a sections map from sections data
   * @param {Array} sections - Array of section objects
   * @returns {Object} Map of sectId to sectionName
   */
  createSectionsMap: function(sections) {
    const map = {};
    if (sections) {
      sections.forEach(section => {
        map[section.sectId] = section.sectionName;
      });
    }
    return map;
  },

  /**
   * Create an employees map from employee data
   * @param {Array} employees - Array of employee objects
   * @returns {Object} Map of employeeId to employee name
   */
  createEmployeesMap: function(employees) {
    const map = {};
    if (employees) {
      employees.forEach(emp => {
        map[emp.employeeId] = emp.name;
      });
    }
    return map;
  }
};

// Make it globally available
window.exportData = window.exportUtils;
