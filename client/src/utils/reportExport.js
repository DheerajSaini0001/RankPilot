import html2pdf from 'html2pdf.js';

/**
 * Exports a DOM element to a professional PDF report.
 * @param {string} elementId - The ID of the HTML element to export.
 * @param {string} fileName - The name of the downloaded file.
 * @param {Object} options - Custom options for customization.
 */
export const exportToPdf = async (elementId, fileName = 'RankPilot-Report', options = {}) => {
  const element = document.getElementById(elementId);
  if (!element) {
      console.error(`Element with ID ${elementId} not found`);
      return;
  }

  // Add temporary class for PDF specific styling
  element.classList.add('pdf-export-container');

  const opt = {
    margin: [10, 5, 10, 5], // top, left, bottom, right in mm
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { 
      scale: 2, // High resolution
      useCORS: true, 
      letterRendering: true,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: document.documentElement.classList.contains('dark') ? '#0A0A0A' : '#FFFFFF',
      windowWidth: 1400 // Force desktop-like layout for the capture
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }, // Smart page breaks
    ...options
  };

  try {
    const worker = html2pdf().set(opt).from(element);
    await worker.save();
  } catch (error) {
    console.error('PDF Export Error:', error);
  } finally {
    // Cleanup the temporary class
    element.classList.remove('pdf-export-container');
  }
};
