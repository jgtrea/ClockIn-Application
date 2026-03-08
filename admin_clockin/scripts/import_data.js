// Common Import Data Utilities
// This file contains reusable functions for importing data from CSV and JSON files

/**
 * Parse CSV content into an array of arrays
 * @param {string} content - The CSV content to parse
 * @returns {Array} Array of arrays representing CSV rows
 */
window.importUtils = {
  /**
   * Parse CSV content into array of arrays
   * @param {string} content - Raw CSV content
   * @returns {Array} Parsed CSV as array of arrays
   */
  parseCSV: function(content) {
    const lines = content.trim().split('\n');
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  },

  /**
   * Create a file input for selecting files
   * @param {string} accept - File types to accept (e.g., '.csv,.json')
   * @param {Function} onFileSelect - Callback when file is selected
   */
  createFileInput: function(accept, onFileSelect) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await onFileSelect(file);
      }
      // Reset input so same file can be selected again
      fileInput.value = '';
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  },

  /**
   * Import data from a CSV file
   * @param {File} file - The CSV file to import
   * @returns {Promise<Array>} Promise resolving to parsed CSV data
   */
  importFromCSV: async function(file) {
    const csvContent = await file.text();
    return this.parseCSV(csvContent);
  },

  /**
   * Import data from a JSON file
   * @param {File} file - The JSON file to import
   * @returns {Promise<Object>} Promise resolving to parsed JSON data
   */
  importFromJSON: async function(file) {
    const jsonContent = await file.text();
    return JSON.parse(jsonContent);
  },

  /**
   * Validate that parsed data has required columns
   * @param {Array} rows - Parsed CSV data (first row should be headers)
   * @param {Array} requiredColumns - Array of required column names
   * @returns {Object} Validation result with isValid and missingColumns
   */
  validateColumns: function(rows, requiredColumns) {
    if (!rows || rows.length === 0) {
      return { isValid: false, missingColumns: requiredColumns };
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const missingColumns = requiredColumns.filter(col => 
      !headers.includes(col.toLowerCase().trim())
    );

    return {
      isValid: missingColumns.length === 0,
      missingColumns: missingColumns,
      headers: headers
    };
  },

  /**
   * Get column index from header row
   * @param {Array} headers - Array of header strings
   * @param {string} columnName - Column name to find
   * @returns {number} Index of column, or -1 if not found
   */
  getColumnIndex: function(headers, columnName) {
    return headers.findIndex(h => 
      h.toLowerCase().trim() === columnName.toLowerCase().trim()
    );
  }
};

// Make it globally available
window.importData = window.importUtils;
