let sections = [];
let filteredSections = [];

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
    sectionsList.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #6b7280;">No sections found</td></tr>';
    return;
  }

  sectionsList.innerHTML = filteredSections.map(section => `
    <tr>
      <td>${section.sectionName || 'Unnamed Section'}</td>
      <td>${section.advisor || '-'}</td>
      <td>${section.yearLevel || '-'}</td>
      <td>${section.totalSchedules}</td>
      <td style="text-align: right;">
        <button class="btn-outline" onclick="viewSectionSchedule('${section.sectId}', '${section.sectionName}')" style="padding: 8px 16px;">
          <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
          View Schedule
        </button>
      </td>
    </tr>
  `).join('');
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

loadSections();
