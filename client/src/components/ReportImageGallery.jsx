import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ReportImageGallery = ({ images = [], title }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const closeButtonRef = useRef(null);
  const imageCount = images.length;
  const isViewerOpen = selectedImageIndex !== null;

  useEffect(() => {
    if (!isViewerOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isViewerOpen]);

  useEffect(() => {
    if (!isViewerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedImageIndex(null);
      } else if (event.key === "ArrowLeft") {
        setSelectedImageIndex((index) => (index + imageCount - 1) % imageCount);
      } else if (event.key === "ArrowRight") {
        setSelectedImageIndex((index) => (index + 1) % imageCount);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [imageCount, isViewerOpen]);

  if (imageCount === 0) return null;

  const galleryLayout =
    imageCount === 1
      ? "grid aspect-[16/10] max-h-[420px] grid-cols-1 sm:aspect-[16/9]"
      : imageCount === 2
        ? "grid aspect-[16/9] grid-cols-2 grid-rows-1"
        : imageCount === 3
        ? "grid aspect-[4/3] grid-cols-2 grid-rows-2"
        : "grid aspect-[4/3] grid-cols-2 grid-rows-2";

  return (
    <>
      <div
        className={`${galleryLayout} mt-4 overflow-hidden rounded-xl bg-stone-100`}
        role="group"
        aria-label={`${imageCount} report ${imageCount === 1 ? "photo" : "photos"}`}
      >
        {images.slice(0, 4).map((imageUrl, index) => (
          <button
            key={`${imageUrl}-${index}`}
            type="button"
            onClick={() => setSelectedImageIndex(index)}
            aria-label={`View photo ${index + 1} of ${imageCount} for ${title}`}
            className={`group relative min-h-0 min-w-0 cursor-zoom-in overflow-hidden focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
              imageCount === 1 ? "" : "border border-white"
            } ${imageCount === 3 && index === 0 ? "row-span-2" : ""}`}
          >
            <img
              src={imageUrl}
              alt={`${title} — photo ${index + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
            {index === 3 && imageCount > 4 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-3xl font-semibold text-white">
                +{imageCount - 4}
              </span>
            )}
          </button>
        ))}
      </div>

      {isViewerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title}, photo ${selectedImageIndex + 1} of ${imageCount}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedImageIndex(null);
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setSelectedImageIndex(null)}
            aria-label="Close image viewer"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X size={22} aria-hidden="true" />
          </button>

          {imageCount > 1 && (
            <button
              type="button"
              onClick={() =>
                setSelectedImageIndex((index) => (index + imageCount - 1) % imageCount)
              }
              aria-label="View previous photo"
              className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          )}

          <figure className="flex max-h-full max-w-full flex-col items-center gap-3">
            <img
              src={images[selectedImageIndex]}
              alt={`${title} — photo ${selectedImageIndex + 1}`}
              className="max-h-[calc(100vh-7rem)] max-w-full object-contain"
            />
            <figcaption className="text-center text-sm text-white/80">
              {title} · {selectedImageIndex + 1} of {imageCount}
            </figcaption>
          </figure>

          {imageCount > 1 && (
            <button
              type="button"
              onClick={() => setSelectedImageIndex((index) => (index + 1) % imageCount)}
              aria-label="View next photo"
              className="absolute right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6"
            >
              <ChevronRight size={24} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default ReportImageGallery;
