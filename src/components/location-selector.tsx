"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

const STORAGE_KEY = "henryslist:location";

export function useSavedLocation() {
  const [location, setLocationState] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocationState(localStorage.getItem(STORAGE_KEY));
    } catch {
      // localStorage unavailable (private browsing, etc.) — location personalization simply doesn't persist.
    }
  }, []);

  function setLocation(value: string | null) {
    setLocationState(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return { location, setLocation };
}

export function LocationSelector() {
  const { location, setLocation } = useSavedLocation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLocation(value.trim() || null);
          setEditing(false);
        }}
        className="flex items-center gap-1"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="City or ZIP"
          className="w-32 rounded-full border border-slate-300 px-3 py-1 text-sm focus:outline-none"
        />
        <button type="submit" className="text-sm font-semibold text-emerald-700">
          Set
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => {
        setValue(location ?? "");
        setEditing(true);
      }}
      className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
    >
      <MapPin size={14} />
      {location ?? "Set your location"}
      {location && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setLocation(null);
          }}
          className="ml-1 text-slate-400 hover:text-slate-700"
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
}
