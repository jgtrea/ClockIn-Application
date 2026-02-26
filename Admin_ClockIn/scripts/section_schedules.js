let sections = [];
let filteredSections = [];
let selectedSections = new Set();
let employees = [];

const SECTIONS_TABLE = 'sections';

const { Paginate, DataTableManager } = window;

Paginate.init({
  containerId: 'section_schedules',
  itemsPerPage: 10,
  onPageChange: () => renderSections()
});

DataTableManager.init({
  tableName: SECTIONS_TABLE,
  supabaseClient: window.supabaseClient,
  primaryKey: 'sectId',
  render: () => {
    Paginate.setTotalItems(DataTableManager.getFilteredData().length);
    renderSections();
  }
});

async function loadSections() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadSections, 500);
    return;
  }

  const { data: sectionsData, error } = await supabase
    .from('sections')
    .select('*')
    .order('sectionName', { ascending: true });

  if (error) {
    console.error('Error loading sections:', error);
    return;
  }

  const { data: schedules } = await supabase
    .from('schedule')
    .select('*, user_employee_data(name, email)');

  window.allSchedules = schedules || [];
  
  const scheduleCounts = {};
  const sectionSchedules = {};
  if (schedules) {
    schedules.forEach(s => {
      scheduleCounts[s.sectId] = (scheduleCounts[s.sectId] || 0) + 1;
      if (!sectionSchedules[s.sectId]) {
        sectionSchedules[s.sectId] = [];
      }
      sectionSchedules[s.sectId].push(s);
    });
  }

  sections = sectionsData.map(section => ({
    ...section,
    totalSchedules: scheduleCounts[section.sectId] || 0,
    schedules: sectionSchedules[section.sectId] || []
  }));

  filteredSections = [...sections];
  
  DataTableManager.setFilteredData(filteredSections);
  Paginate.setTotalItems(filteredSections.length);
  renderSections();
}

function renderSections() {
  const sectionsList = document.getElementById('sectionsList');
  const pageData = Paginate.getPageData(DataTableManager.getFilteredData());
  const totalItems = DataTableManager.getFilteredData().length;
  
  const totalCountEl = document.getElementById('totalSectionsCount');
  if (totalCountEl) {
    totalCountEl.textContent = totalItems;
  }
  
  if (!pageData || pageData.length === 0) {
    sectionsList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No sections found</td></tr>';
    return;
  }

  sectionsList.innerHTML = pageData.map(section => {
    const numericYearLevel = typeof section.yearLevel === 'number' ? section.yearLevel : parseInt(section.yearLevel);
    const yearLevelDisplay = numericYearLevel ? `Grade ${numericYearLevel}` : '-';
    return `
    <tr id="row-${section.sectId}">
      <td class="checkbox-col">
        <input type="checkbox" class="section-checkbox" value="${section.sectId}" ${selectedSections.has(section.sectId) ? 'checked' : ''} onchange="toggleSectionSelection('${section.sectId}')">
      </td>
      <td class="section-name-cell" id="sectionName-${section.sectId}">${section.sectionName || 'Unnamed Section'}</td>
      <td class="advisor-cell" id="advisor-${section.sectId}">${section.advisor || '-'}</td>
      <td class="year-level-cell" id="yearLevel-${section.sectId}">${yearLevelDisplay}</td>
      <td>${section.totalSchedules}</td>
      <td class="actions-col">
        <div class="action-buttons" id="actions-${section.sectId}">
          <button class="btn-icon edit-btn" onclick="editSection('${section.sectId}')" title="Edit">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-icon" onclick="viewSectionSchedule('${section.sectId}', '${section.sectionName}')" title="View">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </div>
        <div class="action-buttons" id="edit-actions-${section.sectId}" style="display: none;">
          <button class="btn-icon save-btn" onclick="saveEditSection('${section.sectId}')" title="Save">
            <span class="material-symbols-outlined">check</span>
          </button>
          <button class="btn-icon cancel-btn" onclick="cancelEditSection('${section.sectId}')" title="Cancel">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </td>
    </tr>
  `}).join('');
  
  updateActionButtons();
}

window.toggleSectionSelection = function(sectId) {
  updateSelectAllState();
  updateActionButtons();
};

function updateSelectAllState() {
  const selectAllBtn = document.getElementById('selectAllSections');
  const checkedBoxes = document.querySelectorAll('.section-checkbox:checked');
  const selectionActionRow = document.getElementById('selectionActionRow');
  const selectedCount = document.getElementById('selectedCount');
  
  if (!selectAllBtn) return;
  
  // Sync selectedSections Set with checked checkboxes
  selectedSections.clear();
  checkedBoxes.forEach(cb => selectedSections.add(cb.value));
  
  const hasSelection = checkedBoxes.length > 0;
  if (hasSelection) {
    selectAllBtn.classList.add('has-selection');
    if (selectionActionRow) {
      selectionActionRow.style.display = 'flex';
      if (selectedCount) {
        selectedCount.textContent = checkedBoxes.length;
      }
    }
  } else {
    selectAllBtn.classList.remove('has-selection');
    if (selectionActionRow) {
      selectionActionRow.style.display = 'none';
    }
  }
}

window.toggleSelectAll = function() {
  const selectAllBtn = document.getElementById('selectAllSections');
  const checkboxes = document.querySelectorAll('.section-checkbox');
  
  if (selectAllBtn.classList.contains('has-selection')) {
    // Deselect all
    checkboxes.forEach(cb => cb.checked = false);
    selectedSections.clear();
  } else {
    // Select all
    checkboxes.forEach(cb => {
      cb.checked = true;
      selectedSections.add(cb.value);
    });
  }
  
  updateSelectAllState();
  updateActionButtons();
};

window.clearSelection = function() {
  const checkboxes = document.querySelectorAll('.section-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  selectedSections.clear();
  updateSelectAllState();
  updateActionButtons();
};

window.exportToCSV = function() {
  const dataToExport = DataTableManager.getFilteredData();
  if (!dataToExport || !dataToExport.length) return;
  
  const headers = ['Section Name', 'Advisor', 'Year Level', 'Subject', 'Teacher', 'Weekday', 'Start Time', 'End Time', 'Room'];
  const rows = [headers.join(',')];
  
  dataToExport.forEach(section => {
    const sectionSchedules = section.schedules || [];
    
    if (sectionSchedules.length === 0) {
      const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
      const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
      const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
      rows.push(`${sectionName},${advisor},${yearLevel},,,,`);
    } else {
      sectionSchedules.forEach(schedule => {
        const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
        const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
        const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
        const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
        const teacher = schedule.user_employee_data?.name || '-';
        const weekday = String(schedule.weekday || '').includes(',') ? `"${schedule.weekday}"` : schedule.weekday || '';
        const startTime = schedule.startTime || '';
        const endTime = schedule.endTime || '';
        const room = String(schedule.room || '').includes(',') ? `"${schedule.room}"` : schedule.room || '';
        rows.push(`${sectionName},${advisor},${yearLevel},${subject},${teacher},${weekday},${startTime},${endTime},${room}`);
      });
    }
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_data_full.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportToJSON = function() {
  const dataToExport = DataTableManager.getFilteredData();
  if (!dataToExport || !dataToExport.length) return;
  
  const exportData = dataToExport.map(section => {
    const sectionSchedules = section.schedules || [];
    const schedulesData = sectionSchedules.map(schedule => ({
      subject: schedule.subject || '',
      teacher: schedule.user_employee_data?.name || '-',
      weekday: schedule.weekday || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      room: schedule.room || ''
    }));
    
    return {
      sectionName: section.sectionName || '',
      advisor: section.advisor || '',
      yearLevel: section.yearLevel || '',
      schedules: schedulesData
    };
  });
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_data_full.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportSelectedRows = function() {
  const selectedIds = [];
  document.querySelectorAll('.section-checkbox:checked').forEach(cb => {
    selectedIds.push(cb.value);
  });
  
  if (selectedIds.length === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = sections.filter(section => selectedIds.includes(String(section.sectId)));
  
  let filename = 'sections_selected_data.csv';
  
  const headers = ['Section Name', 'Advisor', 'Year Level', 'Subject', 'Teacher', 'Weekday', 'Start Time', 'End Time', 'Room'];
  const rows = [headers.join(',')];
  
  selectedData.forEach(section => {
    const sectionSchedules = section.schedules || [];
    
    if (sectionSchedules.length === 0) {
      const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
      const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
      const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
      rows.push(`${sectionName},${advisor},${yearLevel},,,,`);
    } else {
      sectionSchedules.forEach(schedule => {
        const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
        const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
        const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
        const subject = String(schedule.subject || '').includes(',') ? `"${schedule.subject}"` : schedule.subject || '';
        const teacher = schedule.user_employee_data?.name || '-';
        const weekday = String(schedule.weekday || '').includes(',') ? `"${schedule.weekday}"` : schedule.weekday || '';
        const startTime = schedule.startTime || '';
        const endTime = schedule.endTime || '';
        const room = String(schedule.room || '').includes(',') ? `"${schedule.room}"` : schedule.room || '';
        rows.push(`${sectionName},${advisor},${yearLevel},${subject},${teacher},${weekday},${startTime},${endTime},${room}`);
      });
    }
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportSelectedRowsJSON = function() {
  const selectedIds = [];
  document.querySelectorAll('.section-checkbox:checked').forEach(cb => {
    selectedIds.push(cb.value);
  });
  
  if (selectedIds.length === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = sections.filter(section => selectedIds.includes(String(section.sectId)));
  
  let filename = 'sections_selected_data.json';
  
  const exportData = selectedData.map(section => {
    const sectionSchedules = section.schedules || [];
    const schedulesData = sectionSchedules.map(schedule => ({
      subject: schedule.subject || '',
      teacher: schedule.user_employee_data?.name || '-',
      weekday: schedule.weekday || '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      room: schedule.room || ''
    }));
    
    return {
      sectionName: section.sectionName || '',
      advisor: section.advisor || '',
      yearLevel: section.yearLevel || '',
      schedules: schedulesData
    };
  });
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.toggleExportMenu = function() {
  const exportMenu = document.getElementById('exportMenu');
  if (exportMenu) {
    exportMenu.style.display = exportMenu.style.display === 'none' ? 'block' : 'none';
  }
};

window.toggleAddSectionMenu = function() {
  const addSectionMenu = document.getElementById('addSectionMenu');
  const addSectionForm = document.getElementById('addSectionForm');
  if (addSectionMenu) {
    addSectionMenu.style.display = addSectionMenu.style.display === 'none' ? 'block' : 'none';
  }
  // Hide form when closing menu
  if (addSectionForm && addSectionMenu.style.display === 'none') {
    addSectionForm.style.display = 'none';
  }
};

window.showAddSectionForm = function() {
  const addSectionMenu = document.getElementById('addSectionMenu');
  const addSectionForm = document.getElementById('addSectionForm');
  if (addSectionMenu) {
    addSectionMenu.style.display = 'none';
  }
  if (addSectionForm) {
    addSectionForm.style.display = 'block';
  }
};

window.hideAddSectionForm = function() {
  const addSectionForm = document.getElementById('addSectionForm');
  if (addSectionForm) {
    addSectionForm.style.display = 'none';
  }
};

document.addEventListener('click', function(e) {
  const exportMenu = document.getElementById('exportMenu');
  const exportBtn = document.getElementById('exportBtn');
  if (exportMenu && exportBtn && !exportMenu.contains(e.target) && !exportBtn.contains(e.target)) {
    exportMenu.style.display = 'none';
  }
});

window.searchSection = function(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredSections = [...sections];
  } else {
    filteredSections = sections.filter(section => 
      (section.sectionName || '').toLowerCase().includes(searchTerm)
    );
  }
  
  DataTableManager.setFilteredData(filteredSections);
  Paginate.setTotalItems(filteredSections.length);
  Paginate.setPage(1);
  renderSections();
};

window.toggleFilterMenu = function() {
  const filterMenu = document.getElementById('filterMenu');
  const filterWrapper = document.querySelector('.table-filter-wrapper:first-child');
  const isOpen = filterMenu && filterMenu.style.display === 'block';
  
  if (filterMenu) filterMenu.style.display = isOpen ? 'none' : 'block';
  const sortMenu = document.getElementById('sortMenu');
  if (sortMenu) sortMenu.style.display = 'none';
  if (filterWrapper) filterWrapper.classList.toggle('active', !isOpen);
};

window.toggleSortMenu = function() {
  const sortMenu = document.getElementById('sortMenu');
  const sortWrapper = document.querySelector('.table-filter-wrapper:last-child');
  const isOpen = sortMenu && sortMenu.style.display === 'block';
  
  if (sortMenu) sortMenu.style.display = isOpen ? 'none' : 'block';
  const filterMenu = document.getElementById('filterMenu');
  if (filterMenu) filterMenu.style.display = 'none';
  if (sortWrapper) sortWrapper.classList.toggle('active', !isOpen);
};

window.addFilterRow = function() {
  const activeFilters = document.getElementById('activeFilters');
  const filterRow = document.createElement('div');
  filterRow.className = 'filter-row';
  filterRow.innerHTML = `
    <select class="filter-column-select">
      <option value="sectionName">Section Name</option>
      <option value="advisor">Advisor</option>
      <option value="yearLevel">Year Level</option>
    </select>
    <span>:</span>
    <input type="text" class="filter-value-input" placeholder="Enter value...">
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  activeFilters.appendChild(filterRow);
};

window.addSortRow = function() {
  const activeSorts = document.getElementById('activeSorts');
  const sortRow = document.createElement('div');
  sortRow.className = 'filter-row';
  sortRow.innerHTML = `
    <select class="filter-column-select">
      <option value="sectionName">Section Name</option>
      <option value="advisor">Advisor</option>
      <option value="yearLevel">Year Level</option>
      <option value="totalSchedules">Total Schedules</option>
    </select>
    <span>:</span>
    <select class="filter-column-select">
      <option value="asc">Ascending</option>
      <option value="desc">Descending</option>
    </select>
    <button class="remove-filter-btn" onclick="this.parentElement.remove()">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  activeSorts.appendChild(sortRow);
};

window.applyFilters = function() {
  const filterRows = document.querySelectorAll('#activeFilters .filter-row');
  const filters = [];
  
  filterRows.forEach(row => {
    const select = row.querySelector('select');
    const input = row.querySelector('input');
    if (select && input && input.value.trim()) {
      filters.push({ column: select.value, value: input.value.trim().toLowerCase() });
    }
  });
  
  if (filters.length === 0) {
    filteredSections = [...sections];
    document.getElementById('filterStatus').textContent = '';
  } else {
    filteredSections = sections.filter(section => {
      return filters.every(filter => {
        const cellValue = section[filter.column] || '';
        return String(cellValue).toLowerCase().includes(filter.value);
      });
    });
    document.getElementById('filterStatus').textContent = `Filtered (${filters.length})`;
  }
  
  DataTableManager.setFilteredData(filteredSections);
  Paginate.setTotalItems(filteredSections.length);
  Paginate.setPage(1);
  toggleFilterMenu();
  renderSections();
};

window.applySort = function() {
  const sortRows = document.querySelectorAll('#activeSorts .filter-row');
  const sorts = [];
  
  sortRows.forEach(row => {
    const selects = row.querySelectorAll('select');
    if (selects.length >= 2) {
      sorts.push({ column: selects[0].value, ascending: selects[1].value === 'asc' });
    }
  });
  
  if (sorts.length > 0) {
    filteredSections.sort((a, b) => {
      for (const sort of sorts) {
        let valueA = a[sort.column] || '';
        let valueB = b[sort.column] || '';
        if (sort.column !== 'totalSchedules') {
          valueA = String(valueA).toLowerCase();
          valueB = String(valueB).toLowerCase();
        }
        if (valueA !== valueB) {
          return sort.ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
        }
      }
      return 0;
    });
  }
  
  DataTableManager.setFilteredData(filteredSections);
  Paginate.setTotalItems(filteredSections.length);
  toggleSortMenu();
  renderSections();
};

window.viewSectionSchedule = function(sectId, sectionName) {
  window.location.href = `section_schedule_detail.html?sectId=${sectId}&sectionName=${encodeURIComponent(sectionName)}`;
};

// Selection functions
window.toggleSectionSelection = function(sectId) {
  // The updateSelectAllState function will sync the selectedSections Set
  // and update the selection action row
  updateSelectAllState();
  
  // Also update the action buttons container
  const actionContainer = document.getElementById('actionButtonsContainer');
  const selectionCount = document.getElementById('selectionCount');
  
  if (selectedSections.size > 0) {
    actionContainer.style.display = 'flex';
    selectionCount.textContent = `${selectedSections.size} selected`;
  } else {
    actionContainer.style.display = 'none';
  }
};

function updateActionButtons() {
  const count = selectedSections.size;
  const actionContainer = document.getElementById('actionButtonsContainer');
  const selectionCount = document.getElementById('selectionCount');
  
  if (count > 0) {
    if (actionContainer) actionContainer.style.display = 'flex';
    if (selectionCount) selectionCount.textContent = `${count} selected`;
  } else {
    if (actionContainer) actionContainer.style.display = 'none';
  }
}

// Delete selected sections
window.deleteSelectedSections = async function() {
  if (selectedSections.size === 0) return;
  
  const confirmMsg = selectedSections.size === 1
    ? 'Are you sure you want to delete this section?'
    : `Are you sure you want to delete ${selectedSections.size} sections? This will also delete all their schedules.`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const sectId of selectedSections) {
    // First delete all schedules for this section
    await supabase.from('schedule').delete().eq('sectId', sectId);
    // Then delete the section
    const { error } = await supabase.from('sections').delete().eq('sectId', sectId);
    if (error) {
      console.error('Error deleting section:', error);
    }
  }
  
  selectedSections.clear();
  
  const checkboxes = document.querySelectorAll('.section-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  
  const selectAllBtn = document.getElementById('selectAllSections');
  if (selectAllBtn) {
    selectAllBtn.classList.remove('has-selection');
  }
  
  const selectionActionRow = document.getElementById('selectionActionRow');
  if (selectionActionRow) {
    selectionActionRow.style.display = 'none';
  }
  
  loadSections();
};

window.removeAdvisorFromSelected = async function() {
  if (selectedSections.size === 0) return;
  
  const confirmMsg = selectedSections.size === 1
    ? 'Are you sure you want to remove the advisor from this section?'
    : `Are you sure you want to remove the advisor from ${selectedSections.size} sections?`;
  
  if (!confirm(confirmMsg)) return;

  const supabase = window.supabaseClient;
  
  for (const sectId of selectedSections) {
    const { error } = await supabase
      .from('sections')
      .update({ advisor: null })
      .eq('sectId', sectId);
    
    if (error) {
      console.error('Error removing advisor:', error);
    }
  }
  
  selectedSections.clear();
  loadSections();
};

// Load employees for the advisor dropdown
async function loadEmployees() {
  const supabase = window.supabaseClient;
  if (!supabase) {
    setTimeout(loadEmployees, 500);
    return;
  }
  
  const { data: employeesData, error } = await supabase
    .from('user_employee_data')
    .select('*')
    .order('name');
  
  console.log('Loaded employees:', employeesData, error);
  
  if (employeesData) {
    employees = employeesData;
    // Populate advisor datalist
    const advisorDatalist = document.getElementById('advisorList');
    if (advisorDatalist) {
      advisorDatalist.innerHTML = employeesData.map(e => `<option value="${e.name || e.email || 'Unknown'}">`).join('');
    }
  }
}

// Save new section
window.saveSection = async function() {
  const sectionName = document.getElementById('addSectionName').value;
  const advisor = document.getElementById('addAdvisor').value;
  const yearLevel = document.getElementById('addYearLevel').value;

  if (!sectionName || !yearLevel) {
    alert('Please fill in all required fields');
    return;
  }

  const supabase = window.supabaseClient;
  const { error } = await supabase
    .from('sections')
    .insert([{
      sectionName: sectionName,
      advisor: advisor,
      yearLevel: parseInt(yearLevel)
    }]);

  if (error) {
    console.error('Error saving section:', error);
    alert('Failed to save section');
    return;
  }

  document.getElementById('addSectionName').value = '';
  document.getElementById('addAdvisor').value = '';
  document.getElementById('addYearLevel').value = '';
  loadSections();
};

// Inline editing functions
window.editSection = function(sectionId) {
  const section = filteredSections.find(s => s.sectId === sectionId);
  if (!section) return;
  
  // Store original values
  const row = document.getElementById(`row-${sectionId}`);
  if (!row) return;
  
  row.dataset.originalSectionName = section.sectionName || '';
  row.dataset.originalAdvisor = section.advisor || '';
  row.dataset.originalYearLevel = section.yearLevel || '';
  
  // Current advisor value
  const currentAdvisor = section.advisor || '';
  
  // Build year level options (Grade 1 to Grade 12)
  const yearLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const numericYearLevel = typeof section.yearLevel === 'number' ? section.yearLevel : parseInt(section.yearLevel);
  const yearOptions = yearLevels.map((yl, index) => {
    const value = index + 1;
    return `<option value="${value}" ${numericYearLevel === value ? 'selected' : ''}>${yl}</option>`;
  }).join('');
  
  // Replace cell contents with input fields
  document.getElementById(`sectionName-${sectionId}`).innerHTML = `
    <input type="text" class="edit-input" id="edit-sectionName-${sectionId}" value="${section.sectionName || ''}" placeholder="Section Name">
  `;
  
  document.getElementById(`advisor-${sectionId}`).innerHTML = `
    <input type="text" class="edit-input" id="edit-advisor-${sectionId}" value="${currentAdvisor}" placeholder="Advisor" list="edit-advisor-list-${sectionId}">
    <datalist id="edit-advisor-list-${sectionId}"></datalist>
  `;
  
  // Populate advisor datalist for inline edit
  const editAdvisorDatalist = document.getElementById(`edit-advisor-list-${sectionId}`);
  editAdvisorDatalist.innerHTML = employees.map(e => `<option value="${e.name || e.email || 'Unknown'}">`).join('');
  
  document.getElementById(`yearLevel-${sectionId}`).innerHTML = `
    <select class="edit-select" id="edit-yearLevel-${sectionId}">
      ${yearOptions}
    </select>
  `;
  
  // Hide edit buttons, show save/cancel
  document.getElementById(`actions-${sectionId}`).style.display = 'none';
  document.getElementById(`edit-actions-${sectionId}`).style.display = 'flex';
};

window.saveEditSection = async function(sectionId) {
  const newSectionName = document.getElementById(`edit-sectionName-${sectionId}`).value.trim();
  const newAdvisor = document.getElementById(`edit-advisor-${sectionId}`).value;
  const newYearLevel = parseInt(document.getElementById(`edit-yearLevel-${sectionId}`).value);
  
  if (!newSectionName) {
    alert('Section name is required');
    return;
  }
  
  const supabase = window.supabaseClient;
  
  try {
    const { error } = await supabase
      .from('sections')
      .update({
        sectionName: newSectionName,
        advisor: newAdvisor,
        yearLevel: newYearLevel
      })
      .eq('sectId', sectionId);
    
    if (error) throw error;
    
    alert('Section updated successfully');
    await loadSections();
  } catch (error) {
    console.error('Error updating section:', error);
    alert('Error updating section: ' + error.message);
  }
};

window.cancelEditSection = function(sectionId) {
  const row = document.getElementById(`row-${sectionId}`);
  if (!row) return;
  
  // Restore original values
  const originalSectionName = row.dataset.originalSectionName || '';
  const originalAdvisor = row.dataset.originalAdvisor || '';
  const originalYearLevel = row.dataset.originalYearLevel || '';
  
  const currentAdvisor = originalAdvisor || '-';
  const numericYearLevel = originalYearLevel ? parseInt(originalYearLevel) : null;
  const yearLevelDisplay = numericYearLevel ? `Grade ${numericYearLevel}` : '-';
  
  // Restore cell contents
  document.getElementById(`sectionName-${sectionId}`).textContent = originalSectionName || 'Unnamed Section';
  document.getElementById(`advisor-${sectionId}`).textContent = currentAdvisor;
  document.getElementById(`yearLevel-${sectionId}`).textContent = yearLevelDisplay;
  
  // Show edit buttons, hide save/cancel
  document.getElementById(`actions-${sectionId}`).style.display = 'flex';
  document.getElementById(`edit-actions-${sectionId}`).style.display = 'none';
};

// Helper function to get ordinal suffix (st, nd, rd, th)
function getOrdinalSuffix(number) {
  if (number >= 11 && number <= 13) return 'th';
  switch (number % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

loadSections();
loadEmployees();
