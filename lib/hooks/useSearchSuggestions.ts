"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Song } from "@/lib/db";

interface SearchSong extends Song {
  matchedField?: 'title' | 'titleEnglish' | 'titleJapanese' | 'titleKorean' | 'titleRomaji' | 'artist';
  relevanceScore?: number;
}

interface UseSearchSuggestionsReturn {
  // State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  suggestions: SearchSong[];
  suggestionsTotal: number;
  isLoading: boolean;
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  selectedIndex: number;
  inputRef: React.RefObject<HTMLInputElement>;

  // Actions
  handleSearch: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleCloseSuggestions: () => void;
  handleSelectIndex: (index: number) => void;
}

export function useSearchSuggestions(): UseSearchSuggestionsReturn {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSong[]>([]);
  const [suggestionsTotal, setSuggestionsTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCacheRef = useRef<Map<string, { data: SearchSong[]; total: number; timestamp: number }>>(new Map());

  // Cache expiration time (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000;

  // Debounced search for suggestions with caching
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    // Check cache first
    const cached = searchCacheRef.current.get(searchQuery);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setSuggestions(cached.data);
      setSuggestionsTotal(cached.total);
      setShowSuggestions(true);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/songs?query=${encodeURIComponent(searchQuery)}&limit=7&sortBy=relevance`
        );
        const data = await response.json();

        if (data.success) {
          setSuggestions(data.data);
          setSuggestionsTotal(data.pagination.total);
          setShowSuggestions(true);
          setSelectedIndex(-1);

          // Store in cache
          searchCacheRef.current.set(searchQuery, {
            data: data.data,
            total: data.pagination.total,
            timestamp: Date.now(),
          });

          // Clean old cache entries (keep max 50)
          if (searchCacheRef.current.size > 50) {
            const entries = Array.from(searchCacheRef.current.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            entries.slice(0, 10).forEach(([key]) => searchCacheRef.current.delete(key));
          }
        }
      } catch (error) {
        console.error("검색 오류:", error);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const song = suggestions[selectedIndex];
        router.push(`/songs/${song.vocadbId}`);
        setShowSuggestions(false);
      } else if (searchQuery.length >= 2) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setShowSuggestions(false);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  }, [showSuggestions, suggestions, selectedIndex, searchQuery, router]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  }, [searchQuery, router]);

  const handleCloseSuggestions = useCallback(() => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }, []);

  const handleSelectIndex = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    suggestions,
    suggestionsTotal,
    isLoading,
    showSuggestions,
    setShowSuggestions,
    selectedIndex,
    inputRef,
    handleSearch,
    handleKeyDown,
    handleCloseSuggestions,
    handleSelectIndex,
  };
}
