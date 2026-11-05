import { useEffect } from 'react';

export function UsesEffect({ onShow }: { onShow: () => void }) {
  useEffect(onShow, [onShow]);
  return null;
}
