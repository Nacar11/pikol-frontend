import { forwardRef, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Label + input + message, wired for screen readers: the error is linked by
 * aria-describedby and the input carries aria-invalid. */
export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;
    const messageId = `${inputId}-message`;
    const message = error ?? hint;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>{label}</Label>
        <Input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...props}
        />
        {message && (
          <p
            id={messageId}
            className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          >
            {message}
          </p>
        )}
      </div>
    );
  },
);
Field.displayName = 'Field';
