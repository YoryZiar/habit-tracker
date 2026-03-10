export const getWeekDates = (date: Date = new Date()) => {
  const currentDay = date.getDay();
  const diff = date.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i);
    weekDates.push(nextDate);
  }
  return weekDates;
};

export const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export const getDayName = (date: Date) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};
