function formatPrice(price, currencyCode = 'CNY') {
  if (!price && price !== 0) return '¥ --';

  const amount = price / 100;

  if (currencyCode === 'CNY') {
    return `¥${amount.toFixed(2)}`;
  } else if (currencyCode === 'USD') {
    return `$${amount.toFixed(2)}`;
  } else if (currencyCode === 'THB') {
    return `฿${amount.toFixed(2)}`;
  }

  return `${amount.toFixed(2)} ${currencyCode}`;
}

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateTime(dateString) {
  if (!dateString) return '';

  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function debounce(func, wait = 500) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, wait = 1000) {
  let timeout;
  return function executedFunction(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        func(...args);
      }, wait);
    }
  };
}

function getImageUrl(url, size = '') {
  if (!url) return '';

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (size) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${size}`;
    }
    return url;
  }

  return url;
}

function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function validatePhone(phone) {
  const phoneReg = /^1[3-9]\d{9}$/;
  return phoneReg.test(phone);
}

function validateEmail(email) {
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailReg.test(email);
}

module.exports = {
  formatPrice,
  formatNumber,
  formatDate,
  formatDateTime,
  debounce,
  throttle,
  getImageUrl,
  truncateText,
  validatePhone,
  validateEmail,
};
