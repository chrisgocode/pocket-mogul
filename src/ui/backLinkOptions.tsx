import type { Href, NativeStackNavigationOptions } from 'expo-router';
import { BackLink } from './BackLink';
export function backLinkOptions({
  href,
  label,
}: {
  href: Href;
  label: string;
}): NativeStackNavigationOptions {
  const link = <BackLink href={href} label={label} />;
  return {
    headerLeft: () => link,
    unstable_headerLeftItems: () => [
      { type: 'custom', element: link, hidesSharedBackground: true },
    ],
  };
}
