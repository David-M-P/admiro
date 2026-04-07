import { RefObject, useEffect } from "react";

interface UsePlotContainerSizeParams {
  containerRef: RefObject<HTMLDivElement>;
  onResize: () => void;
  deps?: ReadonlyArray<unknown>;
}

export const usePlotContainerSize = ({
  containerRef,
  onResize,
  deps = [],
}: UsePlotContainerSizeParams) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      onResize();
    });
    observer.observe(container);

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [containerRef, onResize, ...deps]);
};

