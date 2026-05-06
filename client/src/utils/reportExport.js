import html2pdf from 'html2pdf.js';
import api from '../api';

export const exportToPdf = async (elementId, fileName = 'RankPilot-Report', options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
      console.error(`Element with ID ${elementId} not found`);
      return;
  }

  element.classList.add('pdf-export-container');

  const opt = {
    margin: [10, 5, 10, 5],
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: document.documentElement.classList.contains('dark') ? '#0A0A0A' : '#FFFFFF',
      windowWidth: 1400 
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    ...options
  };

  try {
    const worker = html2pdf().set(opt).from(element);
    await worker.save();
  } catch (error) {
    console.error('PDF Export Error:', error);
  } finally {
    element.classList.remove('pdf-export-container');
  }
};

export const exportToServerPdf = async (urlPath, fileName = 'RankPilot-Report') => {
  try {
    const storageData = {
      'auth-storage': localStorage.getItem('auth-storage'),
      'date-range-storage': localStorage.getItem('date-range-storage'),
      'filter-storage': localStorage.getItem('filter-storage'),
      'accounts-storage': localStorage.getItem('accounts-storage'),
      'theme-storage': localStorage.getItem('theme-storage'),
    };

    const response = await api.post('/analytics/export/pdf', {
      urlPath,
      clientUrl: window.location.origin,
      storageData
    }, { responseType: 'blob' });

    const downloadUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${fileName}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Server PDF Export Error:', error);
    throw error;
  }
};
