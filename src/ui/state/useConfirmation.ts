import { useCallback, useRef, useState } from 'react';

export type Confirmation<Subject> =
  | { readonly status: 'closed' }
  | { readonly status: 'reviewing'; readonly attemptId: string; readonly subject: Subject }
  | { readonly status: 'pending'; readonly attemptId: string; readonly subject: Subject }
  | {
      readonly status: 'failed';
      readonly attemptId: string;
      readonly subject: Subject;
      readonly message: string;
    };

export type ConfirmationAttempt<Subject> = (attempt: {
  attemptId: string;
  subject: Subject;
}) => Promise<string | undefined>;

const NOTHING = (): void => undefined;

export function useConfirmation<Subject>(onClosed: () => void = NOTHING) {
  const [confirmation, setConfirmation] = useState<Confirmation<Subject>>({ status: 'closed' });
  const pending = useRef(false);

  const open = useCallback((attemptId: string, subject: Subject) => {
    setConfirmation({ status: 'reviewing', attemptId, subject });
  }, []);

  const isOpen = confirmation.status !== 'closed';
  const close = useCallback(() => {
    if (pending.current || !isOpen) return;
    setConfirmation({ status: 'closed' });
    onClosed();
  }, [isOpen, onClosed]);

  async function submit(attempt: ConfirmationAttempt<Subject>): Promise<void> {
    if (pending.current || confirmation.status === 'closed') return;
    const { attemptId, subject } = confirmation;
    pending.current = true;
    setConfirmation({ status: 'pending', attemptId, subject });
    try {
      const failure = await attempt({ attemptId, subject });
      if (failure === undefined) {
        setConfirmation({ status: 'closed' });
        onClosed();
      } else setConfirmation({ status: 'failed', attemptId, subject, message: failure });
    } finally {
      pending.current = false;
    }
  }

  return { confirmation, open, close, submit };
}
