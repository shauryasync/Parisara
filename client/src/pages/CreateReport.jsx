import {
  ArrowLeft,
  BadgeCheck,
  Check,
  MapPin,
  Camera,
  LocateFixed,
  ShieldCheck,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const CATEGORIES = [
  { label: "Pollution", value: "pollution" },
  { label: "Deforestation", value: "deforestation" },
  { label: "Water", value: "water" },
  { label: "Waste", value: "waste" },
  { label: "Other", value: "other" },
];

const formatCoordinates = ([longitude, latitude]) => {
  const formatCoordinate = (value, positiveDirection, negativeDirection) =>
    `${Math.abs(value).toFixed(4)}° ${value >= 0 ? positiveDirection : negativeDirection}`;
  return `${formatCoordinate(latitude, "N", "S")}, ${formatCoordinate(longitude, "E", "W")}`;
};

export default function CreateReport() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    details: "",
    placename: "",
    category: "water",
  });
  const [geo, setGeo] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [imageAction, setImageAction] = useState(null);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [error, setError] = useState(null);
  const allImagePreviews = [...existingImages, ...imagePreviews];
  const remainingImageSlots = Math.max(0, 5 - allImagePreviews.length);

  useEffect(() => {
    if (!id) return;
    const fetchReport = async () => {
      try {
        const res = await api.get(`/reports/get-reports/${id}`);
        const report = res.data.data;

        setFormData({
          title: report.title,
          details: report.details,
          placename: report.placename,
          category: report.category,
        });
        setGeo(report.geo?.coordinates?.length === 2 ? report.geo : null);
        setExistingImages(report.images || []);
      } catch (error) {
        setError(error.response?.data?.message || "Unable to load Report");
      }
    };

    fetchReport();
  }, [id]);

  useEffect(() => {
    return () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location services are not supported by this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(6));
        const longitude = Number(coords.longitude.toFixed(6));
        setGeo({ type: "Point", coordinates: [longitude, latitude] });
        setLocating(false);
      },
      (positionError) => {
        setLocationError(
          positionError.code === positionError.PERMISSION_DENIED
            ? "Allow location access in your browser to use your current location."
            : positionError.code === positionError.TIMEOUT
              ? "Could not get your location in time. Please try again."
              : "Unable to get your current location. Please enter it manually.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category: category.value }));
  };

  const addSelectedImages = (selectedFiles) => {
    const imageFiles = Array.from(selectedFiles).filter((file) => file.type.startsWith("image/"));
    const selectedImages = imageFiles.slice(0, Math.min(3, remainingImageSlots));
    if (imageFiles.length > selectedImages.length) {
      setError(
        remainingImageSlots === 0
          ? "You can attach up to five photos to a report."
          : `You can add ${remainingImageSlots} more photo${remainingImageSlots === 1 ? "" : "s"} to this report.`,
      );
    } else {
      setError(null);
    }

    const selectedPreviews = selectedImages.map((image) => URL.createObjectURL(image));
    previewUrlsRef.current = [...previewUrlsRef.current, ...selectedPreviews];

    setImages((currentImages) => [...currentImages, ...selectedImages]);
    setImagePreviews((currentPreviews) => [...currentPreviews, ...selectedPreviews]);
  };

  const handleImagesChange = (e) => {
    addSelectedImages(e.target.files || []);
    e.target.value = "";
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsDraggingImages(false);
    addSelectedImages(event.dataTransfer.files);
  };

  const handleDeleteExistingImage = async (imageIndex) => {
    setImageAction(`delete-${imageIndex}`);
    setError(null);

    try {
      const response = await api.delete(`/reports/get-reports/${id}/images/${imageIndex}`);
      setExistingImages(response.data.data.images || []);
      if (response.data.cleanupWarning) setError(response.data.cleanupWarning);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete this image.");
    } finally {
      setImageAction(null);
    }
  };

  const handleReplaceExistingImage = async (event, imageIndex) => {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image) return;

    setImageAction(`replace-${imageIndex}`);
    setError(null);
    const payload = new FormData();
    payload.append("image", image);

    try {
      const response = await api.patch(`/reports/get-reports/${id}/images/${imageIndex}`, payload);
      setExistingImages(response.data.data.images || []);
      if (response.data.cleanupWarning) setError(response.data.cleanupWarning);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to replace this image.");
    } finally {
      setImageAction(null);
    }
  };

  const handleRemoveSelectedImage = (imageIndex) => {
    URL.revokeObjectURL(imagePreviews[imageIndex]);
    previewUrlsRef.current.splice(imageIndex, 1);
    setImages((currentImages) => currentImages.filter((_, index) => index !== imageIndex));
    setImagePreviews((currentPreviews) =>
      currentPreviews.filter((_, index) => index !== imageIndex),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = new FormData();
    Object.entries(formData).forEach(([name, value]) => {
      payload.append(name, value);
    });
    payload.append("geo", geo ? JSON.stringify(geo) : "");
    images.forEach((image) => payload.append("images", image));

    try {
      if (isEditMode) {
        await api.patch(`/reports/get-reports/${id}`, payload);
      } else {
        await api.post("/reports/create-report", payload);
      }
      navigate("/me");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f0] text-stone-900">
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <header className="mb-8 max-w-3xl sm:mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-emerald-950">
            <ShieldCheck size={14} aria-hidden="true" />
            Civic action initiative
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-emerald-950 sm:text-4xl">
            {isEditMode ? "Update your environmental report" : "Report an environmental concern"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
            Share what you observed so your community can understand the issue and support local
            action.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="rounded-3xl border border-emerald-950/[0.06] bg-white p-5 shadow-[0_8px_24px_rgba(27,82,64,0.04),0_2px_6px_rgba(0,0,0,0.02)] sm:p-7 lg:col-span-7">
            <form className="space-y-7" onSubmit={handleSubmit}>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-stone-900" htmlFor="title">
                    Issue title <span className="text-red-700">*</span>
                  </label>
                  <span className="text-[11px] text-stone-400">Be clear and specific</span>
                </div>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Waste dumped beside the river path"
                  className="w-full rounded-xl border border-emerald-950/15 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-700/10"
                />
              </div>

              <fieldset>
                <legend className="mb-2.5 text-sm font-semibold text-stone-900">
                  Environmental category <span className="text-red-700">*</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => {
                    const selected = formData.category === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleCategorySelect(category)}
                        className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
                          selected
                            ? "border-sky-700 bg-sky-700/10 text-sky-900"
                            : "border-stone-300 text-stone-600 hover:border-emerald-900/30 hover:bg-stone-50"
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-semibold text-stone-900" htmlFor="location">
                    Incident location <span className="text-red-700">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {geo && (
                      <button
                        type="button"
                        onClick={() => setGeo(null)}
                        className="text-xs font-medium text-stone-500 transition hover:text-stone-800"
                      >
                        Clear map pin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 transition hover:text-emerald-950 disabled:cursor-wait disabled:opacity-60"
                    >
                      <LocateFixed size={15} aria-hidden="true" />
                      {locating ? "Finding your location..." : "Use current location"}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <MapPin
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-800"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    id="location"
                    type="text"
                    name="placename"
                    value={formData.placename}
                    onChange={handleChange}
                    required
                    placeholder="Add a recognizable place or landmark"
                    className="w-full rounded-xl border border-emerald-950/15 bg-white py-3 pl-11 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-700/10"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">
                  {geo
                    ? `Precise map pin added · ${formatCoordinates(geo.coordinates)}`
                    : "Include a street, landmark, or nearby area to help people find it."}
                </p>
                {locationError && (
                  <p role="alert" className="mt-2 text-sm text-red-700">
                    {locationError}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-stone-900" htmlFor="details">
                    What did you observe? <span className="text-red-700">*</span>
                  </label>
                  <span className="shrink-0 text-[11px] text-stone-400" aria-live="polite">
                    {formData.details.length} / 600
                  </span>
                </div>
                <textarea
                  id="details"
                  name="details"
                  rows={5}
                  maxLength={600}
                  value={formData.details}
                  onChange={handleChange}
                  required
                  placeholder="Describe what you saw. Include details like the color, amount, duration, or any nearby impact."
                  className="w-full resize-y rounded-xl border border-emerald-950/15 bg-white p-4 text-sm leading-6 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-700/10"
                />
                <p className="mt-2 text-xs text-stone-500">
                  Stick to what you observed; clear facts help the community understand the issue.
                </p>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-stone-900" htmlFor="images">
                    Evidence photos
                  </label>
                  <span className="text-[11px] text-stone-500">
                    Up to 5 photos · {remainingImageSlots} remaining
                  </span>
                </div>
                <label
                  htmlFor="images"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingImages(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsDraggingImages(false);
                    }
                  }}
                  onDrop={handleImageDrop}
                  className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
                    isDraggingImages
                      ? "border-sky-700 bg-sky-50"
                      : "border-emerald-900/20 bg-emerald-50/40 hover:border-emerald-900/40 hover:bg-emerald-50/80"
                  } ${remainingImageSlots === 0 ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-900 shadow-sm">
                    <Camera size={22} aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-emerald-950">
                    {remainingImageSlots === 0
                      ? "Photo limit reached"
                      : "Drop photos here or browse files"}
                  </span>
                  <span className="mt-1 text-xs text-stone-500">
                    Image files · Select up to {Math.min(3, remainingImageSlots)} at a time
                  </span>
                  <input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={remainingImageSlots === 0}
                    className="sr-only"
                    onChange={handleImagesChange}
                  />
                </label>

                {allImagePreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {existingImages.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                      >
                        <img
                          src={imageUrl}
                          alt={`Existing report evidence ${index + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        {isEditMode && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-stone-950/75 px-3 py-2">
                            <label className="cursor-pointer text-xs font-semibold text-white hover:underline">
                              Replace
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={imageAction !== null}
                                onChange={(event) => handleReplaceExistingImage(event, index)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(index)}
                              disabled={imageAction !== null}
                              aria-label={`Delete existing photo ${index + 1}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:text-red-200 disabled:opacity-50"
                            >
                              <Trash2 size={13} aria-hidden="true" />
                              {imageAction === `delete-${index}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {imagePreviews.map((previewUrl, index) => (
                      <div
                        key={previewUrl}
                        className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
                      >
                        <img
                          src={previewUrl}
                          alt={`New report evidence ${index + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedImage(index)}
                          aria-label={`Remove selected photo ${index + 1}`}
                          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-stone-950/75 px-2 py-2 text-xs font-semibold text-white transition hover:bg-red-900/90"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Remove photo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to={isEditMode ? "/me" : "/feed"}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                >
                  <ArrowLeft size={15} aria-hidden="true" />
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || imageAction !== null}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading
                    ? isEditMode
                      ? "Saving changes..."
                      : "Posting report..."
                    : isEditMode
                      ? "Save changes"
                      : "Post report"}
                  {!loading && <Send size={15} aria-hidden="true" />}
                </button>
              </div>
            </form>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:col-span-5">
            <section
              aria-label="Live report preview"
              className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-[0_12px_32px_rgba(27,82,64,0.08),0_4px_12px_rgba(0,0,0,0.03)] sm:p-5"
            >
              <div className="mb-4 flex items-center justify-between border-b border-emerald-950/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-600/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-700" />
                  </span>
                  <h2 className="text-sm font-semibold tracking-wide text-emerald-950">
                    Live feed preview
                  </h2>
                </div>
                <span className="text-[10px] font-medium text-stone-400">Updates as you type</span>
              </div>

              <article className="rounded-2xl border border-emerald-950/[0.05] bg-[#f8faf7] p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-950">
                      Y
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-900 text-white ring-2 ring-[#f8faf7]">
                        <BadgeCheck size={10} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-stone-900">Your report</p>
                      <p className="text-[11px] text-stone-500">Community post preview</p>
                    </div>
                  </div>
                  <span className="max-w-[45%] truncate rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-900">
                    {CATEGORIES.find(({ value }) => value === formData.category)?.label}
                  </span>
                </div>

                <h3 className="break-words text-base font-semibold leading-snug text-emerald-950">
                  {formData.title.trim() || "Your report title"}
                </h3>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-stone-600">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
                  <span className="break-words">
                    {formData.placename.trim() || "Location not specified"}
                  </span>
                </div>

                {geo && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-100/80 px-2 py-1 text-[10px] font-semibold text-emerald-950">
                    <Check size={12} aria-hidden="true" />
                    Map pin · {formatCoordinates(geo.coordinates)}
                  </p>
                )}

                <div className="mt-4 overflow-hidden rounded-xl border border-stone-200/80 bg-stone-100">
                  {allImagePreviews.length > 0 ? (
                    <div
                      className={
                        allImagePreviews.length > 1 ? "grid grid-cols-2 gap-1" : "aspect-[16/10]"
                      }
                    >
                      {allImagePreviews.slice(0, 4).map((imageUrl, index) => (
                        <img
                          key={`${imageUrl}-${index}`}
                          src={imageUrl}
                          alt={`Preview of report evidence ${index + 1}`}
                          className={`h-full w-full object-cover ${
                            allImagePreviews.length > 1 ? "aspect-[4/3]" : ""
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-stone-400">
                      <Camera size={24} aria-hidden="true" />
                      <span className="text-xs">Your evidence photo will appear here</span>
                    </div>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-stone-600">
                  {formData.details.trim() ||
                    "Add a few clear details about what you observed to help your community understand the issue."}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-stone-200/80 pt-3 text-[11px] font-medium text-stone-500">
                  <ShieldCheck size={14} className="text-emerald-800" aria-hidden="true" />
                  Shared with the community when you post
                </div>
              </article>
            </section>

            <section className="rounded-2xl border border-emerald-950/10 bg-emerald-50/70 p-5">
              <div className="flex items-center gap-2 text-emerald-950">
                <ShieldCheck size={18} className="text-emerald-800" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Tips for a useful report</h2>
              </div>
              <ul className="mt-3 space-y-2.5 text-xs leading-5 text-stone-600">
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  Include nearby landmarks to make the location easier to find.
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  Describe what you observed with clear, factual details.
                </li>
                <li className="flex items-start gap-2">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-emerald-800"
                    aria-hidden="true"
                  />
                  Add a photo when it is safe and appropriate to do so.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
