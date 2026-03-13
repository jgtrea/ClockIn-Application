// Prevent multiple declarations in same context
if (window.DataTableManager) {
  // Already defined, skip re-initialization
} else {
  const DataTableManager = (function() {
  let tableName = '';
  let data = [];
  let filteredData = [];
  let searchTerm = '';
  let supabase = null;
  let renderCallback = null;
  let columns = [];
  let primaryKey = 'id';

  let originalValues = {};
  let expandedRows = {};
  let selectedItems = {};

  function init(config) {
    const {
      tableName: table,
      supabaseClient,
      columns: cols,
      primaryKey: pk = 'id',
      render = null
    } = config;

    tableName = table;
    supabase = supabaseClient;
    columns = cols || [];
    primaryKey = pk;
    renderCallback = render;

    if (!supabase) {
      console.warn('DataTableManager: Supabase client not provided');
    }
  }

  async function loadData(options = {}) {
    if (!supabase || !tableName) return [];

    const { select = '*', orderBy, orderAsc = false, filters = {} } = options;

    try {
      let query = supabase.from(tableName).select(select);

      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      if (orderBy) {
        query = query.order(orderBy, { ascending: orderAsc });
      }

      const { data: result, error } = await query;

      if (error) throw error;

      data = result || [];
      filteredData = [...data];

      if (renderCallback) {
        renderCallback();
      }

      return data;
    } catch (err) {
      console.error(`DataTableManager: Error loading data from ${tableName}:`, err);
      return [];
    }
  }

  function applySearch(searchFields = ['name']) {
    if (!searchTerm) {
      filteredData = [...data];
    } else {
      filteredData = data.filter(item => {
        const searchText = searchFields
          .map(field => item[field] || '')
          .join(' ')
          .toLowerCase();
        return searchText.includes(searchTerm.toLowerCase());
      });
    }

    if (renderCallback) {
      renderCallback();
    }
  }

  function setSearchTerm(term) {
    searchTerm = term || '';
    applySearch();
  }

  function getSearchTerm() {
    return searchTerm;
  }

  function getFilteredData() {
    return filteredData;
  }

  function setFilteredData(newFilteredData) {
    filteredData = newFilteredData;
  }

  function getAllData() {
    return data;
  }

  function setData(newData) {
    data = newData || [];
    filteredData = [...data];
    if (renderCallback) {
      renderCallback();
    }
  }

  async function create(item) {    if (!supabase || !tableName) return { error: 'Not initialized' };

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      data.push(result);
      filteredData = [...data];
      applySearch();

      return { data: result, error: null };
    } catch (err) {
      console.error(`DataTableManager: Error creating item in ${tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async function update(id, updates) {
    if (!supabase || !tableName) return { error: 'Not initialized' };

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(primaryKey, id)
        .select()
        .single();

      if (error) throw error;

      const index = data.findIndex(item => item[primaryKey] === id);
      if (index !== -1) {
        data[index] = { ...data[index], ...result };
      }

      filteredData = [...data];
      applySearch();

      return { data: result, error: null };
    } catch (err) {
      console.error(`DataTableManager: Error updating item in ${tableName}:`, err);
      return { data: null, error: err };
    }
  }

  async function remove(id) {
    if (!supabase || !tableName) return { error: 'Not initialized' };

    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(primaryKey, id);

      if (error) throw error;

      data = data.filter(item => item[primaryKey] !== id);
      filteredData = [...data];
      applySearch();

      return { error: null };
    } catch (err) {
      console.error(`DataTableManager: Error deleting item from ${tableName}:`, err);
      return { error: err };
    }
  }

  function toggleSelection(id) {
    selectedItems[id] = !selectedItems[id];
    return selectedItems[id];
  }

  function getSelectedItems() {
    return Object.entries(selectedItems)
      .filter(([_, selected]) => selected)
      .map(([id]) => id);
  }

  function clearSelection() {
    selectedItems = {};
  }

  function selectAll() {
    filteredData.forEach(item => {
      selectedItems[item[primaryKey]] = true;
    });
  }

  function deselectAll() {
    filteredData.forEach(item => {
      selectedItems[item[primaryKey]] = false;
    });
  }

  function isSelected(id) {
    return !!selectedItems[id];
  }

  function getSelectionCount() {
    return Object.values(selectedItems).filter(Boolean).length;
  }

  function startEdit(id, fields = []) {
    const item = data.find(d => d[primaryKey] === id);
    if (!item) return;

    originalValues[id] = {};
    fields.forEach(field => {
      originalValues[id][field] = item[field];
    });
  }

  function cancelEdit(id) {
    delete originalValues[id];
  }

  function getOriginalValue(id, field) {
    return originalValues[id]?.[field];
  }

  function hasOriginalValues(id) {
    return !!originalValues[id];
  }

  function toggleExpanded(id) {
    expandedRows[id] = !expandedRows[id];
    return expandedRows[id];
  }

  function isExpanded(id) {
    return !!expandedRows[id];
  }

  function collapseAll() {
    expandedRows = {};
  }

  function exportToCSV(filename = `${tableName}_export.csv`) {
    if (!data.length) return;

    const headers = columns.map(col => col.field);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => row[h] || '').join(','))
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
  }

  function exportToJSON(filename = `${tableName}_export.json`) {
    if (!data.length) return;

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  }

  return {
    init,
    loadData,
    applySearch,
    setSearchTerm,
    getSearchTerm,
    getFilteredData,
    setFilteredData,
    getAllData,
    setData,
    create,
    update,
    remove,
    toggleSelection,
    getSelectedItems,
    clearSelection,
    selectAll,
    deselectAll,
    isSelected,
    getSelectionCount,
    startEdit,
    cancelEdit,
    getOriginalValue,
    hasOriginalValues,
    toggleExpanded,
    isExpanded,
    collapseAll,
    exportToCSV,
    exportToJSON,
    formatDate,
    formatDateTime
  };
})();

window.DataTableManager = DataTableManager;
}
