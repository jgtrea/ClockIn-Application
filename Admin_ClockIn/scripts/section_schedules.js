let sections = [];
let filteredSections = [];

const SECTIONS_TABLE = 'sections';

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

  sectionsList.innerHTML = pageData.map(section => `
    <tr id="row-${section.sectId}">
      <td class="checkbox-col"><input type="checkbox" class="section-checkbox" value="${section.sectId}" onchange="toggleSectionSelection('${section.sectId}')"></td>
      <td>${section.sectionName || 'Unnamed Section'}</td>
      <td>${section.advisor || '-'}</td>
      <td>${section.yearLevel || '-'}</td>
      <td>${section.totalSchedules}</td>
      <td style="text-align: right;">
        <div class="action-buttons">
          <button class="btn-icon edit-btn" onclick="viewSectionSchedule('${section.sectId}', '${section.sectionName}')" title="View">
            <span class="material-symbols-outlined">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.toggleSectionSelection = function(sectId) {
  const checkbox = document.querySelector(`.section-checkbox[value="${sectId}"]`);
  if (checkbox) {
    checkbox.checked = checkbox.checked;
  }
  updateSelectAllState();
};

function updateSelectAllState() {
  const selectAllBtn = document.getElementById('selectAllSections');
  const checkedBoxes = document.querySelectorAll('.section-checkbox:checked');
  const selectionActionRow = document.getElementById('selectionActionRow');
  const selectedCount = document.getElementById('selectedCount');
  
  if (!selectAllBtn) return;
  
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
    checkboxes.forEach(cb => cb.checked = false);
    DataTableManager.deselectAll();
  } else {
    checkboxes.forEach(cb => cb.checked = true);
    DataTableManager.selectAll();
  }
  
  updateSelectAllState();
};

window.clearSelection = function() {
  const checkboxes = document.querySelectorAll('.section-checkbox');
  checkboxes.forEach(cb => cb.checked = false);
  DataTableManager.clearSelection();
  updateSelectAllState();
};

window.exportToCSV = function() {
  const dataToExport = DataTableManager.getFilteredData();
  if (!dataToExport.length) return;
  
  const headers = ['Section Name', 'Advisor', 'Year Level', 'Total Schedules'];
  const rows = [headers.join(',')];
  
  dataToExport.forEach(section => {
    const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
    const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
    const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
    const totalSchedules = section.totalSchedules || 0;
    rows.push(`${sectionName},${advisor},${yearLevel},${totalSchedules}`);
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportToJSON = function() {
  const dataToExport = DataTableManager.getFilteredData();
  if (!dataToExport.length) return;
  
  const exportData = dataToExport.map(section => ({
    sectionName: section.sectionName || '',
    advisor: section.advisor || '',
    yearLevel: section.yearLevel || '',
    totalSchedules: section.totalSchedules || 0
  }));
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportSelectedRows = function() {
  const selectedIds = DataTableManager.getSelectedItems();
  if (selectedIds.length === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = sections.filter(section => selectedIds.includes(section.sectId));
  const headers = ['Section Name', 'Advisor', 'Year Level', 'Total Schedules'];
  const rows = [headers.join(',')];
  
  selectedData.forEach(section => {
    const sectionName = String(section.sectionName || '').includes(',') ? `"${section.sectionName}"` : section.sectionName || '';
    const advisor = String(section.advisor || '').includes(',') ? `"${section.advisor}"` : section.advisor || '';
    const yearLevel = String(section.yearLevel || '').includes(',') ? `"${section.yearLevel}"` : section.yearLevel || '';
    const totalSchedules = section.totalSchedules || 0;
    rows.push(`${sectionName},${advisor},${yearLevel},${totalSchedules}`);
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

window.exportSelectedRowsJSON = function() {
  const selectedIds = DataTableManager.getSelectedItems();
  if (selectedIds.length === 0) {
    alert('No rows selected');
    return;
  }
  
  const selectedData = sections.filter(section => selectedIds.includes(section.sectId));
  const exportData = selectedData.map(section => ({
    sectionName: section.sectionName || '',
    advisor: section.advisor || '',
    yearLevel: section.yearLevel || '',
    totalSchedules: section.totalSchedules || 0
  }));
  
  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sections_selected_export.json';
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

window.changeItemsPerPage = function(value) {
  const itemsPerPage = parseInt(value) || 10;
  Paginate.setItemsPerPage(itemsPerPage);
  Paginate.setPage(1);
  renderSections();
};

window.goToFirstPage = function() {
  Paginate.setPage(1);
  renderSections();
};

window.goToLastPage = function() {
  const totalPages = Math.ceil(Paginate.getTotalItems() / Paginate.getItemsPerPage());
  Paginate.setPage(totalPages);
  renderSections();
};

window.goToPage = function(pageNum) {
  const page = parseInt(pageNum) || 1;
  Paginate.setPage(page);
  renderSections();
};

window.changePage = function(delta) {
  const newPage = Paginate.getCurrentPage() + delta;
  Paginate.setPage(newPage);
  renderSections();
};

loadSections();
