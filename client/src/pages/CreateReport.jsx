import {
  MapPin,
  Camera,
  LocateFixed,
  Send,
  Bookmark,
  ThumbsUp,
  MessageCircle,
  Share2,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const CATEGORIES = [
  { label: "Pollution", value: "pollution" },
  { label: "Deforestation", value: "deforestation" },
  { label: "Water", value: "water" },
  { label: "Waste", value: "waste" },
  { label: "Other", value: "other" },
];

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
  const [error, setError] = useState(null);
  const allImagePreviews = [...existingImages, ...imagePreviews];

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

  const handleImagesChange = (e) => {
    const remainingImageSlots = Math.max(0, 5 - existingImages.length - images.length);
    const selectedImages = Array.from(e.target.files).slice(0, Math.min(3, remainingImageSlots));
    const selectedPreviews = selectedImages.map((image) => URL.createObjectURL(image));
    previewUrlsRef.current = [...previewUrlsRef.current, ...selectedPreviews];

    setImages((currentImages) => [...currentImages, ...selectedImages]);
    setImagePreviews((currentPreviews) => [...currentPreviews, ...selectedPreviews]);
    e.target.value = "";
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
      const response = await api.patch(
        `/reports/get-reports/${id}/images/${imageIndex}`,
        payload,
      );
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
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Form */}
          <section className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-emerald-900 tracking-tight">
                Report an Environmental Issue
              </h1>
              <p className="text-stone-500 mt-1.5">
                Help your community and local authorities identify and resolve ecological concerns.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Title */}
              <div className="space-y-2">
                <label className="block font-semibold text-sm" htmlFor="title">
                  Report Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Illegal dumping at Pine Creek"
                  className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition"
                />
              </div>

              {/* Category chips */}
              <div className="space-y-2.5">
                <label className="block font-semibold text-sm">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${
                        formData.category === category.value
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "text-stone-600 border-stone-300 hover:bg-stone-100"
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-sm" htmlFor="location">
                    Incident Location name <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {geo && (
                      <button
                        type="button"
                        onClick={() => setGeo(null)}
                        className="text-sm font-medium text-stone-500 hover:text-stone-800"
                      >
                        Clear map pin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-60"
                    >
                      <LocateFixed size={16} />
                      {locating ? "Getting location..." : "Use current location"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-stone-500">
                  {geo
                    ? "Map pin saved from your current coordinates. Enter a recognizable place name above."
                    : "Enter a recognizable place name, or use your current location to set a precise map pin."}
                </p>
                {locationError && (
                  <p role="alert" className="text-sm text-red-600">
                    {locationError}
                  </p>
                )}
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-emerald-700" size={20} />
                  <input
                    id="location"
                    type="text"
                    name="placename"
                    value={formData.placename}
                    onChange={handleChange}
                    required
                    placeholder="Where is this happening?"
                    className="w-full pl-11 pr-4 py-3 rounded-lg border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-sm" htmlFor="details">
                    Incident Description <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-stone-400">0 / 600 characters</span>
                </div>
                <textarea
                  id="details"
                  name="details"
                  rows={4}
                  maxLength={600}
                  value={formData.details}
                  onChange={handleChange}
                  required
                  placeholder="Describe what you observed (smell, color, duration, hazard severity)..."
                  className="w-full p-3.5 rounded-lg border border-stone-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-none transition resize-none"
                />
              </div>

              {/* Image upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-sm">Visual Evidence</label>
                  <span className="text-xs text-stone-400">Up to 5 photos total, 15MB each</span>
                </div>

                <label
                  htmlFor="images"
                  className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center gap-2"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <Camera size={24} />
                  </div>
                  <p className="font-medium text-emerald-800 text-sm">
                    Drag & drop photos or click to browse
                  </p>
                  <p className="text-xs text-stone-500">JPEG, PNG, or HEIC</p>
                  <input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleImagesChange}
                  />
                </label>
                {(existingImages.length > 0 || imagePreviews.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {existingImages.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="relative overflow-hidden rounded-lg"
                      >
                        <img
                          src={imageUrl}
                          alt={`Existing report evidence ${index + 1}`}
                          className="h-28 w-full object-cover"
                        />
                        {isEditMode && (
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/65 p-2">
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
                              className="text-xs font-semibold text-white hover:underline disabled:opacity-50"
                            >
                              {imageAction === `delete-${index}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {imagePreviews.map((previewUrl, index) => (
                      <div key={previewUrl} className="relative overflow-hidden rounded-lg">
                        <img
                          src={previewUrl}
                          alt={`New report evidence ${index + 1}`}
                          className="h-28 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedImage(index)}
                          className="absolute bottom-0 left-0 right-0 bg-black/65 p-2 text-xs font-semibold text-white hover:underline"
                        >
                          Remove selected image
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* Actions */}
              <div className="pt-6 border-t border-stone-200 flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-full border border-stone-300 hover:bg-stone-100 text-sm font-medium flex items-center gap-2 transition"
                >
                  <Bookmark size={16} />
                  Save as Draft
                </button>
                <button
                  type="submit"
                  disabled={loading || imageAction !== null}
                  className="px-7 py-3 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-60 transition font-semibold text-sm flex items-center gap-2"
                >
                  {loading
                    ? isEditMode
                      ? "Saving..."
                      : "Posting..."
                    : isEditMode
                      ? "Save Changes"
                      : "Post Report"}
                </button>
              </div>
            </form>
          </section>

          {/* RIGHT: Live preview */}
          <aside className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold">
                    {"You"}
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-800 text-white rounded-full flex items-center justify-center ring-2 ring-white">
                      <BadgeCheck size={10} />
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">You</div>
                    <div className="text-xs text-stone-400">Just now</div>
                  </div>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {CATEGORIES.find(({ value }) => value === formData.category)?.label ||
                    "No category selected"}
                </span>
              </div>

              <div className="px-5 pb-3">
                <h3 className="font-bold text-emerald-900 line-clamp-2">
                  {formData.title || "Untitled Environmental Report"}
                </h3>
                <p className="text-sm text-stone-500 mt-1.5 line-clamp-3 leading-relaxed">
                  {formData.details || "No detailed observations provided yet."}
                </p>
              </div>

              <div className="px-4">
                {allImagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {allImagePreviews.map((previewUrl, index) => (
                      <img
                        key={previewUrl}
                        src={previewUrl}
                        alt={`Report evidence ${index + 1}`}
                        className="rounded-xl aspect-[16/10] w-full object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl aspect-[16/10] bg-stone-100 flex items-center justify-center text-stone-400 text-sm">
                    No photo attached yet
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 pt-4">
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium"
                    >
                      <ThumbsUp size={16} />
                      <span>0</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-500 text-sm"
                    >
                      <MessageCircle size={16} />
                      <span>0</span>
                    </button>
                  </div>
                  <button type="button" className="p-1.5 text-stone-400 hover:text-stone-700">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-stone-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
                <ShieldCheck size={18} className="text-emerald-700" />
                <span>Before you post</span>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">
                Reports are reviewed by the community. Add a clear photo and specific location to
                help others verify what you saw.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
