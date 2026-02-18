let sections = [];
let filteredSections = [];
let selectedSections = new Set();
let employees = [];

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
    .select('sectId');

  const scheduleCounts = {};
  if (schedules) {
    schedules.forEach(s => {
      scheduleCounts[s.sectId] = (scheduleCounts[s.sectId] || 0) + 1;
    });
  }

  sections = sectionsData.map(section => ({
    ...section,
    totalSchedules: scheduleCounts[section.sectId] || 0
  }));

  filteredSections = [...sections];
  renderSections();
}

function renderSections() {
  const sectionsList = document.getElementById('sectionsList');
  
  if (!filteredSections || filteredSections.length === 0) {
    sectionsList.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #6b7280;">No sections found</td></tr>';
    return;
  }

  sectionsList.innerHTML = filteredSections.map(section => {
    const numericYearLevel = typeof section.yearLevel === 'number' ? section.yearLevel : parseInt(section.yearLevel);
    const yearLevelDisplay = numericYearLevel ? `Grade ${numericYearLevel}` : '-';
    return `
    <tr data-section-id="${section.sectId}">
      <td class="checkbox-col">
        <input type="checkbox" class="row-checkbox" ${selectedSections.has(section.sectId) ? 'checked' : ''} onchange="toggleSectionSelect('${section.sectId}', this.checked)">
      </td>
      <td class="section-name-cell">${section.sectionName || 'Unnamed Section'}</td>
      <td class="advisor-cell">${section.advisor || '-'}</td>
      <td class="year-level-cell">${yearLevelDisplay}</td>
      <td>${section.totalSchedules}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon edit-btn" onclick="startEditSection('${section.sectId}')" title="Edit">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn-outline" onclick="viewSectionSchedule('${section.sectId}', '${section.sectionName}')" style="padding: 6px 12px;">
            <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  `}).join('');
  
  updateActionButtons();
}

window.searchSection = function(query) {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) {
    filteredSections = [...sections];
  } else {
    filteredSections = sections.filter(section => 
      (section.sectionName || '').toLowerCase().includes(searchTerm)
    );
  }
  
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
  
  toggleSortMenu();
  renderSections();
};

window.viewSectionSchedule = function(sectId, sectionName) {
  window.location.href = `section_schedule_detail.html?sectId=${sectId}&sectionName=${encodeURIComponent(sectionName)}`;
};

// Selection functions
window.toggleSelectAll = function() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const isChecked = selectAllCheckbox.checked;
  const checkboxes = document.querySelectorAll('.row-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    const sectId = checkbox.getAttribute('onchange').match(/'([^']+)'/)[1];
    if (isChecked) {
      selectedSections.add(sectId);
    } else {
      selectedSections.delete(sectId);
    }
  });
  
  updateActionButtons();
};

window.toggleSectionSelect = function(sectId, checked) {
  if (checked) {
    selectedSections.add(sectId);
  } else {
    selectedSections.delete(sectId);
  }
  updateActionButtons();
};

function updateActionButtons() {
  const count = selectedSections.size;
  const actionContainer = document.getElementById('actionButtonsContainer');
  const selectionCount = document.getElementById('selectionCount');
  
  if (count > 0) {
    actionContainer.style.display = 'flex';
    selectionCount.textContent = `${count} selected`;
  } else {
    actionContainer.style.display = 'none';
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
  loadSections();
};

// Remove advisor from selected sections
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
    const advisorSelect = document.getElementById('addAdvisor');
    if (advisorSelect) {
      advisorSelect.innerHTML = '<option value="">-- Select Advisor --</option>' + 
        employeesData.map(e => `<option value="${e.name || e.email || 'Unknown'}">${e.name || e.email || 'Unknown'}</option>`).join('');
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
  document.getElementById('addYearLevel').value = '';
  loadSections();
};

// Inline editing functions
window.startEditSection = function(sectionId) {
  const section = filteredSections.find(s => s.sectId === sectionId);
  if (!section) return;
  
  const row = document.querySelector(`tr[data-section-id="${sectionId}"]`);
  if (!row) return;
  
  // Store original values
  row.dataset.originalSectionName = section.sectionName || '';
  row.dataset.originalAdvisor = section.advisor || '';
  row.dataset.originalYearLevel = section.yearLevel || '';
  
  // Build advisor options - show all from user_employee_data
  const currentAdvisor = section.advisor || '';
  const advisorOptions = employees
    .map(emp => `<option value="${emp.name || emp.email || 'Unknown'}" ${currentAdvisor === (emp.name || emp.email) ? 'selected' : ''}>${emp.name || emp.email || 'Unknown'}</option>`)
    .join('');
  
  // Build year level options (Grade 1 to Grade 12)
  const yearLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const numericYearLevel = typeof section.yearLevel === 'number' ? section.yearLevel : parseInt(section.yearLevel);
  const yearOptions = yearLevels.map((yl, index) => {
    const value = index + 1; // Grade 1 = 1, Grade 2 = 2, etc.
    return `<option value="${value}" ${numericYearLevel === value ? 'selected' : ''}>${yl}</option>`;
  }).join('');
  
  row.innerHTML = `
    <td class="checkbox-col">
      <input type="checkbox" class="row-checkbox" disabled>
    </td>
    <td>
      <input type="text" class="edit-input" id="edit-sectionName" value="${section.sectionName || ''}" placeholder="Section Name">
    </td>
    <td>
      <select class="edit-select" id="edit-advisor">
        <option value="">-- No Advisor --</option>
        ${advisorOptions}
      </select>
    </td>
    <td>
      <select class="edit-select" id="edit-yearLevel">
        ${yearOptions}
      </select>
    </td>
    <td>${section.totalSchedules}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-icon save-btn" onclick="saveEditSection('${sectionId}')" title="Save">
          <span class="material-symbols-outlined">check</span>
        </button>
        <button class="btn-icon cancel-btn" onclick="cancelEditSection('${sectionId}')" title="Cancel">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </td>
  `;
};

window.saveEditSection = async function(sectionId) {
  const section = filteredSections.find(s => s.sectId === sectionId);
  if (!section) return;
  
  const row = document.querySelector(`tr[data-section-id="${sectionId}"]`);
  if (!row) return;
  
  const newSectionName = row.querySelector('#edit-sectionName').value.trim();
  const newAdvisor = row.querySelector('#edit-advisor').value;
  const newYearLevel = parseInt(row.querySelector('#edit-yearLevel').value);
  
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
  const row = document.querySelector(`tr[data-section-id="${sectionId}"]`);
  if (!row) return;
  
  // Restore original row
  const section = filteredSections.find(s => s.sectId === sectionId);
  if (!section) return;
  
  const currentAdvisor = section.advisor || '-';
  const numericYearLevel = typeof section.yearLevel === 'number' ? section.yearLevel : parseInt(section.yearLevel);
  const yearLevelDisplay = numericYearLevel ? `Grade ${numericYearLevel}` : '-';
  
  row.innerHTML = `
    <td class="checkbox-col">
      <input type="checkbox" class="row-checkbox" ${selectedSections.has(section.sectId) ? 'checked' : ''} onchange="toggleSectionSelect('${section.sectId}', this.checked)">
    </td>
    <td class="section-name-cell">${section.sectionName || 'Unnamed Section'}</td>
    <td class="advisor-cell">${currentAdvisor}</td>
    <td class="year-level-cell">${yearLevelDisplay}</td>
    <td>${section.totalSchedules}</td>
    <td>
      <div class="action-buttons">
        <button class="btn-icon edit-btn" onclick="startEditSection('${section.sectId}')" title="Edit">
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button class="btn-outline" onclick="viewSectionSchedule('${section.sectId}', '${section.sectionName}')" style="padding: 6px 12px;">
          <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
        </button>
      </div>
    </td>
  `;
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
