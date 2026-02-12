const PaginationManager = (function() {
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalItems = 0;
  let onPageChangeCallback = null;
  let containerId = null;

  const defaultIds = {
    firstBtn: 'firstBtn',
    prevBtn: 'prevBtn',
    nextBtn: 'nextBtn',
    lastBtn: 'lastBtn',
    pageInput: 'pageNumberInput',
    totalItemsSpan: 'totalUsersCount',
    itemsPerPageInput: 'itemsPerPageInput',
    selectionActionRow: 'selectionActionRow',
    selectedCount: 'selectedCount'
  };

  function init(config = {}) {
    const {
      initialPage = 1,
      itemsPerPage: perPage = 10,
      containerId: cId = null,
      onPageChange = null
    } = config;

    currentPage = initialPage;
    itemsPerPage = perPage;
    containerId = cId;
    onPageChangeCallback = onPageChange;

    if (cId) {
      setupEventListeners(cId);
    }
  }

  function setupEventListeners(cId) {
    const firstBtn = document.getElementById(defaultIds.firstBtn);
    const prevBtn = document.getElementById(defaultIds.prevBtn);
    const nextBtn = document.getElementById(defaultIds.nextBtn);
    const lastBtn = document.getElementById(defaultIds.lastBtn);
    const pageInput = document.getElementById(defaultIds.pageInput);
    const itemsPerPageInput = document.getElementById(defaultIds.itemsPerPageInput);

    if (firstBtn) firstBtn.onclick = () => goToFirstPage();
    if (prevBtn) prevBtn.onclick = () => changePage(-1);
    if (nextBtn) nextBtn.onclick = () => changePage(1);
    if (lastBtn) lastBtn.onclick = () => goToLastPage();
    if (pageInput) pageInput.onchange = (e) => goToPage(parseInt(e.target.value) || 1);
    if (itemsPerPageInput) itemsPerPageInput.onchange = (e) => setItemsPerPage(parseInt(e.target.value) || 10);
  }

  function setItemsPerPage(count) {
    let newCount = parseInt(count);
    if (isNaN(newCount) || newCount < 1) newCount = 10;
    itemsPerPage = newCount;
    currentPage = 1;
    updateUI();
    if (onPageChangeCallback) onPageChangeCallback(currentPage);
  }

  function changePage(direction) {
    const totalPages = getTotalPages();
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
      currentPage = newPage;
      updateUI();
      if (onPageChangeCallback) onPageChangeCallback(currentPage);
    }
  }

  function goToPage(pageNum) {
    const totalPages = getTotalPages();
    let newPage = parseInt(pageNum);
    
    if (isNaN(newPage)) newPage = 1;
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages || 1;
    
    currentPage = newPage;
    updateUI();
    if (onPageChangeCallback) onPageChangeCallback(currentPage);
  }

  function goToFirstPage() {
    currentPage = 1;
    updateUI();
    if (onPageChangeCallback) onPageChangeCallback(currentPage);
  }

  function goToLastPage() {
    const totalPages = getTotalPages();
    currentPage = totalPages || 1;
    updateUI();
    if (onPageChangeCallback) onPageChangeCallback(currentPage);
  }

  function getTotalPages() {
    return Math.ceil(totalItems / itemsPerPage);
  }

  function getCurrentPage() {
    return currentPage;
  }

  function getItemsPerPage() {
    return itemsPerPage;
  }

  function setTotalItems(count) {
    totalItems = count;
    updateUI();
  }

  function setPage(page) {
    currentPage = page;
    updateUI();
  }

  function updateUI() {
    const totalPages = getTotalPages();
    
    const firstBtn = document.getElementById(defaultIds.firstBtn);
    const prevBtn = document.getElementById(defaultIds.prevBtn);
    const nextBtn = document.getElementById(defaultIds.nextBtn);
    const lastBtn = document.getElementById(defaultIds.lastBtn);
    const pageInput = document.getElementById(defaultIds.pageInput);
    const totalItemsSpan = document.getElementById(defaultIds.totalItemsSpan);
    const itemsPerPageInput = document.getElementById(defaultIds.itemsPerPageInput);

    if (totalItemsSpan) totalItemsSpan.textContent = totalItems;
    if (itemsPerPageInput) itemsPerPageInput.value = itemsPerPage;
    if (pageInput) {
      pageInput.value = currentPage;
      pageInput.max = totalPages || 1;
    }

    if (firstBtn) {
      firstBtn.disabled = currentPage === 1;
      firstBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    }
    if (prevBtn) {
      prevBtn.disabled = currentPage === 1;
      prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
    }
    if (nextBtn) {
      nextBtn.disabled = currentPage === totalPages || totalPages === 0;
      nextBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
    }
    if (lastBtn) {
      lastBtn.disabled = currentPage === totalPages || totalPages === 0;
      lastBtn.style.opacity = (currentPage === totalPages || totalPages === 0) ? '0.5' : '1';
    }
  }

  function getPageData(dataArray) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataArray.slice(startIndex, endIndex);
  }

  return {
    init,
    setItemsPerPage,
    changePage,
    goToPage,
    goToFirstPage,
    goToLastPage,
    getTotalPages,
    getCurrentPage,
    getItemsPerPage,
    setTotalItems,
    setPage,
    updateUI,
    getPageData
  };
})();

window.PaginationManager = PaginationManager;
