import { useState, type ImgHTMLAttributes } from 'react';
import placeholder from '../../assets/image-unavailable.svg';

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src?: string };

/** Keep the reserved dimensions and fall back locally once, also on network/404 failures. */
export function SafeImage({ src = '', alt = '', ...props }: SafeImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const fallback = !src || failedSource === src;
  return <img {...props} src={fallback ? placeholder : src} alt={alt}
    onError={fallback ? undefined : () => setFailedSource(src)} />;
}
