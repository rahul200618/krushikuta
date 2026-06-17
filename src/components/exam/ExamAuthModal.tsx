import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ExamAuthForm } from './ExamAuthForm';

interface ExamAuthModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onSuccess: () => void;
}

export function ExamAuthModal({ open, isOpen, onOpenChange, onClose, onSuccess }: ExamAuthModalProps) {
  const finalOpen = open ?? isOpen ?? false;
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };

  return (
    <Dialog open={finalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden border-border bg-card">
        <ExamAuthForm 
          onSuccess={() => {
            onSuccess();
            handleOpenChange(false);
          }} 
          isModal={true} 
        />
      </DialogContent>
    </Dialog>
  );
}
