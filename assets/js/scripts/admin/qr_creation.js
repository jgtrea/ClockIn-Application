/**
 * assets/js/scripts/admin/qr_creation.js
 * Controller for generating and managing QR codes linked to sections.
 */

// Global maps and references
let supabaseInstance = null;
let sectionsMap = {};
let currentActiveQR = null; // Store active preview data

document.addEventListener("DOMContentLoaded", () => {
  initPage();
});

/**
 * Initialize elements, actions, and load data.
 */
async function initPage() {
  // Check and wait for window.supabaseClient to be initialized
  supabaseInstance = window.supabaseClient;
  if (!supabaseInstance) {
    setTimeout(initPage, 100);
    return;
  }

  const generateBtn = document.getElementById("generateBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  
  if (generateBtn) {
    generateBtn.addEventListener("click", handleGenerateQR);
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener("click", loadQRCodes);
  }
  
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", downloadCurrentPDF);
  }

  // Load sections list first, then load existing QR codes
  await loadSections();
  await loadQRCodes();
}

/**
 * Load sections from public.sections to populate select dropdown.
 */
async function loadSections() {
  const dropdown = document.getElementById("sectionDropdown");
  if (!dropdown) return;
  
  try {
    const { data: sections, error } = await supabaseInstance
      .from("sections")
      .select("sectId, sectionName")
      .order("sectionName", { ascending: true });
      
    if (error) throw error;
    
    // Clear and fill dropdown
    dropdown.innerHTML = '<option value="" disabled selected>-- Select a Section --</option>';
    sectionsMap = {};
    
    if (sections && sections.length > 0) {
      sections.forEach(s => {
        sectionsMap[s.sectId] = s.sectionName;
        const opt = document.createElement("option");
        opt.value = s.sectId;
        opt.textContent = s.sectionName;
        dropdown.appendChild(opt);
      });
    } else {
      dropdown.innerHTML = '<option value="" disabled>No sections found</option>';
    }
  } catch (err) {
    console.error("Failed to load sections:", err);
    dropdown.innerHTML = '<option value="" disabled>Error loading sections</option>';
  }
}

/**
 * Load QR History Table with sections join.
 */
async function loadQRCodes() {
  const tbody = document.getElementById("qrTableBody");
  if (!tbody) return;
  
  // Show spinner
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align: center; padding: 32px 0;">
        <div class="qr-spinner"></div>
        <p style="color: #6b7280; margin: 12px 0 0 0; font-size: 14px;">Fetching QR history...</p>
      </td>
    </tr>
  `;
  
  try {
    const { data: qrList, error } = await supabaseInstance
      .from("qr")
      .select(`
        qrId,
        createdAt,
        scanCount,
        status,
        sectId,
        sections (
          sectionName
        )
      `)
      .order("createdAt", { ascending: false });
      
    if (error) throw error;
    
    tbody.innerHTML = "";
    
    if (!qrList || qrList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="no-qr-records">
            <span class="material-symbols-outlined">qr_code_scanner</span>
            No QR Codes generated yet.
          </td>
        </tr>
      `;
      return;
    }
    
    qrList.forEach(item => {
      // Resolve section name safely
      const sectionName = item.sections 
        ? (Array.isArray(item.sections) ? item.sections[0]?.sectionName : item.sections.sectionName) 
        : (sectionsMap[item.sectId] || "Unknown Section");
        
      const dateStr = item.createdAt 
        ? new Date(item.createdAt).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
          }) 
        : "-";
        
      const row = document.createElement("tr");
      
      row.innerHTML = `
        <td style="font-weight: 600;">${escapeHTML(sectionName)}</td>
        <td style="font-family: monospace; font-size: 12px; color: #4b5563;">${item.qrId}</td>
        <td style="color: #6b7280; font-size: 13px;">${dateStr}</td>
        <td style="font-weight: 500;">${item.scanCount || 0}</td>
        <td>
          <span class="status-badge ${item.status ? 'status-active' : 'status-inactive'}" 
                style="cursor: pointer; user-select: none;" 
                onclick="toggleQRStatus('${item.qrId}', ${item.status})" 
                title="Click to toggle status">
            <span class="material-symbols-outlined" style="font-size: 14px; margin-right: 4px;">
              ${item.status ? 'check_circle' : 'cancel'}
            </span>
            ${item.status ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style="text-align: right; padding-right: 24px;">
          <div class="qr-actions" style="justify-content: flex-end;">
            <button class="qr-icon-btn" onclick="previewQR('${item.qrId}', '${escapeQuote(sectionName)}')" title="Preview QR">
              <span class="material-symbols-outlined">visibility</span>
            </button>
            <button class="qr-icon-btn" onclick="downloadPDFDirect('${item.qrId}', '${escapeQuote(sectionName)}')" title="Download PDF">
              <span class="material-symbols-outlined">download</span>
            </button>
            <button class="qr-icon-btn delete" onclick="deleteQR('${item.qrId}')" title="Delete QR">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load QR history:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 32px 0; color: #dc2626;">
          <span class="material-symbols-outlined" style="font-size: 32px; display: block; margin-bottom: 8px;">error</span>
          Error loading QR history database. Please refresh.
        </td>
      </tr>
    `;
  }
}

/**
 * Handle new QR Code generation trigger.
 */
async function handleGenerateQR() {
  const dropdown = document.getElementById("sectionDropdown");
  const statusCheckbox = document.getElementById("statusCheckbox");
  
  if (!dropdown || !dropdown.value) {
    alert("Please select a target Section first.");
    return;
  }
  
  const sectId = dropdown.value;
  const sectionName = dropdown.options[dropdown.selectedIndex].text;
  const isActive = statusCheckbox ? statusCheckbox.checked : true;
  
  const generateBtn = document.getElementById("generateBtn");
  generateBtn.disabled = true;
  generateBtn.innerHTML = '<span class="qr-spinner" style="width:16px; height:16px; margin:0 8px 0 0; display:inline-block; border-width:2px;"></span> Generating...';
  
  try {
    // Insert new row in public.qr
    const { data: newQR, error } = await supabaseInstance
      .from("qr")
      .insert([
        {
          sectId: sectId,
          status: isActive,
          scanCount: 0
        }
      ])
      .select();
      
    if (error) throw error;
    if (!newQR || newQR.length === 0) throw new Error("No record returned");
    
    const qrRecord = newQR[0];
    
    // Preview the newly generated QR Code
    previewQR(qrRecord.qrId, sectionName);
    
    // Refresh table history
    await loadQRCodes();
  } catch (err) {
    console.error("Failed to generate QR:", err);
    alert("Error saving QR Code to Supabase. Check database log.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="material-symbols-outlined">bolt</span> Generate QR Code';
  }
}

/**
 * Render the QR Preview Card client-side.
 */
function previewQR(qrId, sectionName) {
  const container = document.getElementById("qrPreviewContainer");
  const placeholder = document.getElementById("qrPlaceholder");
  const wrapper = document.getElementById("qrImageWrapper");
  const previewTitle = document.getElementById("previewSectionName");
  const previewUUID = document.getElementById("previewUUID");
  const downloadBtn = document.getElementById("downloadPdfBtn");
  
  if (!container || !wrapper) return;
  
  // Update state
  currentActiveQR = { qrId, sectionName };
  
  // Set elements visible
  placeholder.style.display = "none";
  wrapper.style.display = "flex";
  wrapper.innerHTML = ""; // Clear old QR
  
  previewTitle.style.display = "block";
  previewTitle.textContent = sectionName;
  
  previewUUID.style.display = "block";
  previewUUID.textContent = `ID: ${qrId}`;
  
  downloadBtn.style.display = "flex";
  
  container.classList.add("active");
  
  // Render new QR Code
  // Encodes the UUID string directly so scanned devices can process the unique ID.
  new QRCode(wrapper, {
    text: qrId,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

/**
 * Download currently previewed QR Code PDF.
 */
function downloadCurrentPDF() {
  if (!currentActiveQR) return;
  downloadPDFDirect(currentActiveQR.qrId, currentActiveQR.sectionName);
}

/**
 * Generate and download PDF containing [Section Name] followed by the QR Code image.
 */
function downloadPDFDirect(qrId, sectionName) {
  // Temporary container for offscreen rendering to ensure we have the exact canvas/image URL
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  document.body.appendChild(tempDiv);
  
  new QRCode(tempDiv, {
    text: qrId,
    width: 256,
    height: 256,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
  
  // Wait short millisecond for library rendering engine to finish drawing canvas
  setTimeout(() => {
    try {
      const img = tempDiv.querySelector("img");
      const canvas = tempDiv.querySelector("canvas");
      const dataURL = img && img.src && img.src.startsWith("data:") 
        ? img.src 
        : (canvas ? canvas.toDataURL("image/png") : null);
        
      if (!dataURL) {
        alert("Failed to capture QR image for PDF.");
        return;
      }
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      // Page size is 210 x 297 mm
      
      // 1. Draw Section Name prominently at the top
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(17, 24, 39); // #111827
      doc.text(sectionName, 105, 55, { align: "center" });
      
      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(107, 114, 128); // #6b7280
      doc.text("ClockIn Attendance System — Secure Check-In QR", 105, 68, { align: "center" });
      
      // Divider line
      doc.setDrawColor(229, 231, 235); // #e5e7eb
      doc.setLineWidth(0.5);
      doc.line(30, 78, 180, 78);
      
      // 2. Draw QR Code centered below it (size 100x100mm)
      // Center X: 105 - (100 / 2) = 55
      doc.addImage(dataURL, "PNG", 55, 95, 100, 100);
      
      // Draw UUID detail caption below QR Code
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175); // #9ca3af
      doc.text(`QR ID: ${qrId}`, 105, 210, { align: "center" });
      
      // Footer branding
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("Generated via ClockIn Management Console", 105, 270, { align: "center" });
      
      // Trigger instant browser download
      const sanitizedName = sectionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${sanitizedName}_attendance_qr.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Error printing PDF document.");
    } finally {
      // Clean up temporary DOM element
      document.body.removeChild(tempDiv);
    }
  }, 120);
}

/**
 * Toggle Active Status of a QR Code row.
 */
async function toggleQRStatus(qrId, currentStatus) {
  try {
    const { error } = await supabaseInstance
      .from("qr")
      .update({ status: !currentStatus })
      .eq("qrId", qrId);
      
    if (error) throw error;
    
    // Refresh list to update UI
    await loadQRCodes();
    
    // If the currently previewed QR was toggled, update preview
    if (currentActiveQR && currentActiveQR.qrId === qrId) {
      previewQR(currentActiveQR.qrId, currentActiveQR.sectionName);
    }
  } catch (err) {
    console.error("Failed to toggle QR status:", err);
    alert("Error updating status in Supabase database.");
  }
}

/**
 * Delete a QR Code from DB and confirm.
 */
async function deleteQR(qrId) {
  const check = confirm("Are you sure you want to permanently delete this QR Code record? Scanned history will be lost.");
  if (!check) return;
  
  try {
    const { error } = await supabaseInstance
      .from("qr")
      .delete()
      .eq("qrId", qrId);
      
    if (error) throw error;
    
    // Clear preview if it was the deleted QR
    if (currentActiveQR && currentActiveQR.qrId === qrId) {
      clearPreview();
    }
    
    await loadQRCodes();
  } catch (err) {
    console.error("Failed to delete QR:", err);
    alert("Error deleting record from Supabase table.");
  }
}

/**
 * Reset preview box to default placeholder.
 */
function clearPreview() {
  currentActiveQR = null;
  const container = document.getElementById("qrPreviewContainer");
  const placeholder = document.getElementById("qrPlaceholder");
  const wrapper = document.getElementById("qrImageWrapper");
  const previewTitle = document.getElementById("previewSectionName");
  const previewUUID = document.getElementById("previewUUID");
  const downloadBtn = document.getElementById("downloadPdfBtn");
  
  if (container) container.classList.remove("active");
  if (placeholder) placeholder.style.display = "flex";
  if (wrapper) {
    wrapper.style.display = "none";
    wrapper.innerHTML = "";
  }
  if (previewTitle) previewTitle.style.display = "none";
  if (previewUUID) previewUUID.style.display = "none";
  if (downloadBtn) downloadBtn.style.display = "none";
}

// Helper utilities to escape inputs and prevent XSS injection
function escapeHTML(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeQuote(str) {
  if (!str) return "";
  return str.toString()
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}
