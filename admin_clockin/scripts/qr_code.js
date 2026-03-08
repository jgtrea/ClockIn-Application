async function getOrCreateQR(sectId) {
  const supabase = window.supabaseClient;
  
  const { data: existingQR, error: fetchError } = await supabase
    .from('qr')
    .select('*')
    .eq('sectId', sectId)
    .maybeSingle();
  
  if (fetchError) {
    console.error('Error fetching QR:', fetchError);
    throw fetchError;
  }
  
  if (existingQR) {
    return existingQR;
  }
  
  const { data: newQR, error: insertError } = await supabase
    .from('qr')
    .insert([{
      sectId: sectId,
      status: true
    }])
    .select()
    .single();
  
  if (insertError) {
    console.error('Error creating QR:', insertError);
    throw insertError;
  }
  
  return newQR;
}

async function generateQRCodeDataURL(qrId) {
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrId)}`;
  return apiUrl;
}

async function showQRPrompt(sectId, sectionName) {
  try {
    const qrRecord = await getOrCreateQR(sectId);
    const qrImageUrl = await generateQRCodeDataURL(qrRecord.qrId);
    
    const overlay = document.createElement('div');
    overlay.className = 'qr-prompt-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;
    
    const promptContent = document.createElement('div');
    promptContent.className = 'qr-prompt-content';
    promptContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    promptContent.innerHTML = `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1a1a1a;">
        QR Code - ${sectionName}
      </h2>
      <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
        <img src="${qrImageUrl}" alt="QR Code" style="max-width: 200px; height: auto;">
      </div>
      <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
        Scan this code to check in to ${sectionName}
      </p>
      <button class="add-user-btn" id="downloadQRBtn" style="width: 50%; margin: 0 auto; display: flex; justify-content: center;">
        Download
      </button>
      <button class="btn-outline" id="closeQRPrompt" style="margin-top: 8px; width: 50%; margin-left: auto; margin-right: auto; height: 30px; padding: 6px 12px; display: flex; justify-content: center;">
        Close
      </button>
    `;
    
    overlay.appendChild(promptContent);
    document.body.appendChild(overlay);
    
    document.getElementById('closeQRPrompt').onclick = () => {
      document.body.removeChild(overlay);
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
    
    document.getElementById('downloadQRBtn').onclick = async () => {
      try {
        const filename = `qr_${sectionName.replace(/\s+/g, '_').toLowerCase()}.png`;
        
        // Load image and convert to data URL for download
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataURI = canvas.toDataURL('image/png');
          
          var download = document.createElement('a');
          download.href = dataURI;
          download.download = filename;
          download.click();
        };
        img.onerror = () => {
          alert('Failed to load QR code image');
        };
        img.src = qrImageUrl;
      } catch (err) {
        console.error('Error downloading:', err);
        alert('Failed to download QR code');
      }
    };
    
  } catch (error) {
    console.error('Error showing QR prompt:', error);
    alert('Failed to load QR code. Please try again.');
  }
}

async function createQRForSection(sectId) {
  const supabase = window.supabaseClient;
  
  const { data: newQR, error } = await supabase
    .from('qr')
    .insert([{
      sectId: sectId,
      status: true
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating QR for section:', error);
    throw error;
  }
  
  return newQR;
}
