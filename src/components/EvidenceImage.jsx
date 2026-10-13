import React, { useEffect, useState } from 'react';
import { apiImage } from '../lib/api';

export default function EvidenceImage({ src, alt, linked = false, ...props }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let url;
    apiImage(src, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setResult({ src, url });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ src, error: error.message });
    });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);
  if (result?.src !== src) return <span role="status">Loading screenshot…</span>;
  if (result.error) return <span role="status">{result.error}</span>;
  const image = <img {...props} src={result.url} alt={alt} />;
  return linked ? <a href={result.url} target="_blank" rel="noreferrer">{image}</a> : image;
}
