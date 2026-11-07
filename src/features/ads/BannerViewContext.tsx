import { createContext, use, type ReactNode } from 'react';

export type BannerViewProps = { onLoaded: () => void; onClicked: () => void };

export type RenderBanner = (props: BannerViewProps) => ReactNode;

const renderNoBanner: RenderBanner = () => null;

const BannerViewContext = createContext<RenderBanner>(renderNoBanner);

export function BannerViewProvider({
  render,
  children,
}: {
  render: RenderBanner;
  children: ReactNode;
}) {
  return <BannerViewContext value={render}>{children}</BannerViewContext>;
}

export function useRenderBanner(): RenderBanner {
  return use(BannerViewContext);
}
