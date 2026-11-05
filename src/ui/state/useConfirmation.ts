import { useCallback, useRef, useState } from 'react';

export type Confirmation =
  | { readonly status: 'closed' }
  | { readonly status: 'reviewing'; readonly attemptId: string }
  | { readonly status: 'pending'; readonly attemptId: string }
  | { readonly status: 'failed'; readonly attemptId: string; readonly message: string };

export type ConfirmationAttempt = (attemptId: string) => Promise<string | undefined>;

const CLOSED: Confirmation = { status: 'closed' };

export function useConfirmation() {
  const [confirmation, setConfirmation] = useState<Confirmation>(CLOSED);
  const pending = useRef(false);

  const open = useCallback((attemptId: string) => {
    setConfirmation({ status: 'reviewing', attemptId });
  }, []);

  const close = useCallback(() => {
    if (!pending.current) setConfirmation(CLOSED);
  }, []);

  async function submit(attempt: ConfirmationAttempt): Promise<void> {
    if (pending.current || confirmation.status === 'closed') return;
    const { attemptId } = confirmation;
    pending.current = true;
    setConfirmation({ status: 'pending', attemptId });
    try {
      const failure = await attempt(attemptId);
      setConfirmation(
        failure === undefined ? CLOSED : { status: 'failed', attemptId, message: failure },
      );
    } finally {
      pending.current = false;
    }
  }

  return { confirmation, open, close, submit };
}
