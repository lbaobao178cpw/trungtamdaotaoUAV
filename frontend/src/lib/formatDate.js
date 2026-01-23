export default function formatDateDDMM(dateInput) {
  if (!dateInput && dateInput !== 0) return '--';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}
