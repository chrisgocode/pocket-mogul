import { useState } from 'react';

export function useTwoFlags() {
  const [isOpen, setOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  return { isOpen, setOpen, isSaving, setSaving };
}
