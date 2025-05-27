import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addDays } from 'date-fns';
import { cn } from '@/lib/utils'; // Assuming cn utility for tailwind class merging
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Import Dialog components

const DateRangePicker = ({ onApply, initialStartDate, initialEndDate }) => {
  const [startDate, setStartDate] = useState(initialStartDate || null);
  const [endDate, setEndDate] = useState(initialEndDate || null);
  const [focusedDate, setFocusedDate] = useState(initialStartDate || new Date()); // For calendar navigation
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null); // New state for selected tab
  // No need for calendarRef and handleClickOutside if using Shadcn Dialog

  const handleDateClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      // If clicking the start date again, deselect it
      if (isSameDay(day, startDate)) {
        setStartDate(null);
        setEndDate(null); // Also clear end date if start is deselected
      } else {
        setStartDate(day);
        setEndDate(null);
      }
    } else if (day < startDate) {
      setEndDate(startDate);
      setStartDate(day);
    } else {
      setEndDate(day);
    }
  };

  const renderDays = (month) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    // Pad start of month with previous month's days to align with Sunday
    const firstDayOfWeek = start.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const paddedDays = Array.from({ length: firstDayOfWeek }).map((_, i) => null).concat(days);

    return paddedDays.map((day, index) => {
      if (!day) {
        return <div key={`empty-${index}`} className="w-8 h-8"></div>;
      }

      const isSelected = (startDate && isSameDay(day, startDate)) || (endDate && isSameDay(day, endDate));
      const isInRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
      const isToday = isSameDay(day, new Date());

      return (
        <div
          key={day.toISOString()}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer",
            "hover:bg-accent hover:text-accent-foreground",
            isToday && "border border-primary",
            isInRange && "bg-purple-200", // Light purple for range
            isSelected && "bg-purple-500 text-white", // Darker purple for selected
            (isSameDay(day, startDate) && endDate) && "rounded-r-none", // Start of range, not end
            (isSameDay(day, endDate) && startDate) && "rounded-l-none", // End of range, not start
            (isSameDay(day, startDate) && isSameDay(day, endDate)) && "rounded-full" // Single day selected
          )}
          onClick={() => handleDateClick(day)}
        >
          {format(day, 'd')}
        </div>
      );
    });
  };

  const handlePrevMonth = () => {
    setFocusedDate(subMonths(focusedDate, 1));
  };

  const handleNextMonth = () => {
    setFocusedDate(addMonths(focusedDate, 1));
  };

  const handleApply = () => {
    if (startDate && endDate) {
      onApply(startDate, endDate);
      setIsCalendarOpen(false);
    } else {
      // Handle case where only one date is selected or no dates
      onApply(startDate, startDate); // If only one date, treat as single day range
      setIsCalendarOpen(false);
    }
  };

  const handleCancel = () => {
    setStartDate(initialStartDate || null);
    setEndDate(initialEndDate || null);
    setIsCalendarOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
    setFocusedDate(today);
    onApply(today, today);
    setIsCalendarOpen(false); // Close dialog after selection
    setSelectedTab(null); // Reset selected tab
  };

  const handleYesterday = () => {
    const yesterday = addDays(new Date(), -1);
    setStartDate(yesterday);
    setEndDate(yesterday);
    setFocusedDate(yesterday);
    onApply(yesterday, yesterday);
    setIsCalendarOpen(false); // Close dialog after selection
    setSelectedTab(null); // Reset selected tab
  };

  const displayRange = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
    } else if (startDate) {
      return format(startDate, 'MMM dd, yyyy');
    }
    return 'Select Date Range';
  };

  return (
    <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-[280px] justify-start text-left font-normal"
          onClick={() => { setIsCalendarOpen(true); setSelectedTab("Today"); }} // Open dialog and set default tab
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayRange()}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-4">
        <DialogHeader>
          <DialogTitle>Select Date Range</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => { setSelectedTab("Today"); handleToday(); }}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => { setSelectedTab("Yesterday"); handleYesterday(); }}>Yesterday</Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedTab("Custom")}>Custom</Button>
          </div>

          {selectedTab === "Custom" && (
            <>
              <div className="flex justify-between items-center mb-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold">{format(focusedDate, 'MMMM yyyy')}</span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 text-center text-sm text-muted-foreground mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                  <div key={day} className="w-8 h-8 flex items-center justify-center font-bold">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {renderDays(focusedDate)}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DateRangePicker;
