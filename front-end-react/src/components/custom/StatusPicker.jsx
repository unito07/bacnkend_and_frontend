import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ListFilter } from 'lucide-react'; // Using ListFilter icon
import { cn } from '@/lib/utils';

const StatusPicker = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statuses = [
    { value: '', label: 'All Statuses', colorClasses: 'hover:bg-accent' }, // Default hover for "All"
    { value: 'Success', label: 'Success', colorClasses: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-600' },
    { value: 'Failed', label: 'Failed', colorClasses: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600' },
    { value: 'Cancelled', label: 'Cancelled', colorClasses: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-600 dark:text-yellow-100 dark:hover:bg-yellow-500' },
  ];

  const handleSelectStatus = (statusValue) => {
    onStatusChange(statusValue);
    setIsOpen(false);
  };

  const displayLabel = statuses.find(s => s.value === currentStatus)?.label || 'Filter by Status';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-auto justify-start text-left font-normal"
        >
          <ListFilter className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[300px] p-4">
        <DialogHeader>
          <DialogTitle>Filter by Status</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {statuses.map((status) => (
            <Button
              key={status.value}
              variant={currentStatus === status.value ? 'default' : 'outline'}
              onClick={() => handleSelectStatus(status.value)}
              className={cn(
                "w-full justify-start",
                currentStatus !== status.value && status.colorClasses,
                // If selected (default variant), ensure text color contrasts with primary bg if needed,
                // or rely on default variant's text color. For now, let default handle selected.
              )}
            >
              {status.label}
            </Button>
          ))}
        </div>
        {/* No explicit Apply/Cancel needed, selection is immediate */}
      </DialogContent>
    </Dialog>
  );
};

export default StatusPicker;
