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
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const CATEGORIES = [
  { label: "Pollution", value: "pollution" },
  { label: "Deforestation", value: "deforestation" },
  { label: "Water", value: "water" },
  { label: "Waste", value: "waste" },
  { label: "Other", value: "other" },
];

export default function CreateReport() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    details: "",
    placename: "",
    category: "water",
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const previewUrlsRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategorySelect = (category) => {
    setFormData((prev) => ({ ...prev, category: category.value }));
  };

  const handleImagesChange = (e) => {
    const selectedImages = Array.from(e.target.files).slice(0, 3);

    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = selectedImages.map((image) => URL.createObjectURL(image));

    setImages(selectedImages);
    setImagePreviews(previewUrlsRef.current);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = new FormData();
    Object.entries(formData).forEach(([name, value]) => {
      payload.append(name, value);
    });
    images.forEach((image) => payload.append("images", image));

    try {
      await api.post("/reports/create-report", payload);
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
                    Incident Location <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 text-sm font-medium"
                  >
                    <LocateFixed size={16} />
                    Use current location
                  </button>
                </div>
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
                  <span className="text-xs text-stone-400">Max 3 photos, 15MB each</span>
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
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 w-full">
                      {imagePreviews.map((previewUrl, index) => (
                        <img
                          key={previewUrl}
                          src={previewUrl}
                          alt={`Selected evidence ${index + 1}`}
                          className="h-20 w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </label>
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
                  disabled={loading}
                  className="px-7 py-3 rounded-full bg-emerald-800 text-white hover:bg-emerald-700 disabled:opacity-60 transition font-semibold text-sm flex items-center gap-2"
                >
                  <Send size={18} />
                  {loading ? "Posting..." : "Post Report"}
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
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {imagePreviews.map((previewUrl, index) => (
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
