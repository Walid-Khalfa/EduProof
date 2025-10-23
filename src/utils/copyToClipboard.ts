/**
 * Robust clipboard utility with fallback support
 * Works across browsers (Chrome, Firefox, Edge, Safari/iOS) and HTTPS contexts
 */

/**
 * Copy text to clipboard with automatic fallback
 * @param value - Text to copy to clipboard
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  // Guard against empty input
  if (!value) {
    return false;
  }

  // Try modern Clipboard API first (requires secure context)
  if (navigator?.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
      // Fall through to fallback method
    }
  }

  // Fallback: use temporary textarea + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    
    // Make textarea invisible but focusable
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.zIndex = '-1';
    
    document.body.appendChild(textarea);
    
    // Select and focus
    textarea.focus();
    textarea.select();
    
    // Try to copy
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      console.error('execCommand failed:', e);
    }
    
    // Clean up
    document.body.removeChild(textarea);
    
    return success;
  } catch (err) {
    console.error('Clipboard fallback failed:', err);
    return false;
  }
}
