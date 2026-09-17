import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(startDate || new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day: Date) => {
    if (!startDate || (startDate && endDate)) {
      onChange(day, null);
    } else {
      if (isBefore(day, startDate)) {
        onChange(day, startDate);
      } else {
        onChange(startDate, day);
      }
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDateGrid = startOfWeek(monthStart);
  const endDateGrid = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDateGrid;

  while (day <= endDateGrid) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      let isSelected = false;
      let isInRange = false;
      
      if (startDate && isSameDay(day, startDate)) isSelected = true;
      if (endDate && isSameDay(day, endDate)) isSelected = true;
      if (startDate && endDate && isAfter(day, startDate) && isBefore(day, endDate)) isInRange = true;

      days.push(
        <div
          key={day.toString()}
          onClick={() => onDateClick(cloneDay)}
          className={`flex justify-center items-center w-8 h-8 text-sm cursor-pointer rounded-full transition-colors
            ${!isSameMonth(day, monthStart) ? "text-zinc-300" : "text-zinc-700"}
            ${isSelected ? "bg-blue-600 text-white font-bold" : ""}
            ${isInRange && !isSelected ? "bg-blue-50 text-blue-800 rounded-none" : ""}
            ${!isSelected && !isInRange ? "hover:bg-zinc-100" : ""}
          `}
        >
          {format(day, dateFormat)}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="flex justify-between w-full mt-1" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="w-[280px] bg-white rounded-xl">
      <div className="flex justify-between items-center mb-4 px-2">
        <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"><ChevronLeft size={18}/></button>
        <span className="font-bold text-sm text-zinc-800 capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-600 transition-colors"><ChevronRight size={18}/></button>
      </div>
      <div className="flex justify-between mb-2">
        {weekDays.map((d, i) => <div key={i} className="w-8 text-center text-xs font-bold text-zinc-400">{d}</div>)}
      </div>
      <div className="flex flex-col">
        {rows}
      </div>
    </div>
  );
}
