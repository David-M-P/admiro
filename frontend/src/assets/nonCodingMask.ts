import nonCodingMaskRawUrl from "@/assets/hgdp_wgs.20190516.mask.inverse.bed?url";
import nonCodingMaskGt1000kbUrl from "@/assets/hgdp_wgs.20190516.mask.inverse.gt1000kb.bed?url";
import nonCodingMaskGt1kbUrl from "@/assets/hgdp_wgs.20190516.mask.inverse.gt1kb.bed?url";
import { useEffect, useState } from "react";

export type GenomicInterval = {
  start: number;
  end: number;
};

export type PixelInterval = {
  x: number;
  width: number;
};

export type NonCodingMask = Record<string, GenomicInterval[]>;

const NON_CODING_MASK_MODE = "1000000" as "1000" | "1000000" | "none";
const MIN_REGION_LENGTH_BP =
  NON_CODING_MASK_MODE === "1000"
    ? 1000
    : NON_CODING_MASK_MODE === "1000000"
      ? 1_000_000
      : 0;
const nonCodingMaskUrl =
  NON_CODING_MASK_MODE === "1000"
    ? nonCodingMaskGt1kbUrl
    : NON_CODING_MASK_MODE === "1000000"
      ? nonCodingMaskGt1000kbUrl
      : nonCodingMaskRawUrl;
const PIXEL_MERGE_GAP = 1;

let cachedMask: NonCodingMask | null = null;
let loadPromise: Promise<NonCodingMask> | null = null;

const toChromosomeKey = (rawChromosome: string): string | null => {
  const normalized = rawChromosome.trim().replace(/^chr/i, "");
  const compact = normalized.toUpperCase().replace(/[\s_-]+/g, "");
  if (compact === "X" || compact === "XPRIME") return "X";

  const chromosomeAsNumber = Number(compact);
  if (!Number.isInteger(chromosomeAsNumber)) return null;
  if (chromosomeAsNumber < 1 || chromosomeAsNumber > 22) return null;
  return String(chromosomeAsNumber);
};

const parseNonCodingMask = (bedText: string): NonCodingMask => {
  const parsedMask: NonCodingMask = {};
  const lines = bedText.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [rawChromosome, rawStart, rawEnd] = trimmed.split(/\s+/);
    if (!rawChromosome || !rawStart || !rawEnd) continue;

    const chromosome = toChromosomeKey(rawChromosome);
    if (!chromosome) continue;

    const start = Number(rawStart);
    const end = Number(rawEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end <= start) continue;
    if (end - start <= MIN_REGION_LENGTH_BP) continue;

    const intervals = parsedMask[chromosome] ?? (parsedMask[chromosome] = []);
    intervals.push({ start, end });
  }

  for (const chromosome of Object.keys(parsedMask)) {
    const intervals = parsedMask[chromosome]
      .slice()
      .sort((a, b) => (a.start !== b.start ? a.start - b.start : a.end - b.end));
    const merged: GenomicInterval[] = [];

    for (const interval of intervals) {
      const previous = merged[merged.length - 1];
      if (!previous || interval.start > previous.end) {
        merged.push({ ...interval });
        continue;
      }

      previous.end = Math.max(previous.end, interval.end);
    }

    parsedMask[chromosome] = merged;
  }

  return parsedMask;
};

export const loadNonCodingMask = async (): Promise<NonCodingMask> => {
  if (cachedMask) return cachedMask;
  if (!loadPromise) {
    loadPromise = fetch(nonCodingMaskUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load noncoding mask BED (status ${response.status}).`);
        }
        return response.text();
      })
      .then((bedText) => {
        const parsed = parseNonCodingMask(bedText);
        cachedMask = parsed;
        return parsed;
      })
      .catch((error) => {
        loadPromise = null;
        throw error;
      });
  }

  return loadPromise;
};

const findFirstIntersectingIndex = (intervals: GenomicInterval[], minBp: number): number => {
  let low = 0;
  let high = intervals.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (intervals[mid].end <= minBp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
};

export const getVisibleNonCodingIntervals = (
  mask: NonCodingMask | null,
  chromosome: string,
  minBp: number,
  maxBp: number
): GenomicInterval[] => {
  if (!mask || maxBp <= minBp) return [];
  const chromosomeKey = toChromosomeKey(chromosome);
  if (!chromosomeKey) return [];
  const intervals = mask[chromosomeKey];
  if (!intervals || intervals.length === 0) return [];

  const startIndex = findFirstIntersectingIndex(intervals, minBp);
  const visibleIntervals: GenomicInterval[] = [];

  for (let index = startIndex; index < intervals.length; index += 1) {
    const interval = intervals[index];
    if (interval.start >= maxBp) break;

    const clippedStart = Math.max(minBp, interval.start);
    const clippedEnd = Math.min(maxBp, interval.end);
    if (clippedEnd > clippedStart) {
      visibleIntervals.push({ start: clippedStart, end: clippedEnd });
    }
  }

  return visibleIntervals;
};

export const toPixelMergedIntervals = (
  intervals: GenomicInterval[],
  projectBpToX: (positionBp: number) => number
): PixelInterval[] => {
  const mergedPixels: PixelInterval[] = [];

  for (const interval of intervals) {
    let left = Math.floor(projectBpToX(interval.start));
    let right = Math.ceil(projectBpToX(interval.end));
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
    if (right <= left) right = left + 1;

    const previous = mergedPixels[mergedPixels.length - 1];
    if (!previous) {
      mergedPixels.push({ x: left, width: right - left });
      continue;
    }

    const previousRight = previous.x + previous.width;
    if (left <= previousRight + PIXEL_MERGE_GAP) {
      previous.width = Math.max(previousRight, right) - previous.x;
      continue;
    }

    mergedPixels.push({ x: left, width: right - left });
  }

  return mergedPixels;
};

export const useNonCodingMask = (): NonCodingMask | null => {
  const [mask, setMask] = useState<NonCodingMask | null>(cachedMask);

  useEffect(() => {
    let mounted = true;
    loadNonCodingMask()
      .then((loadedMask) => {
        if (mounted) setMask(loadedMask);
      })
      .catch((error) => {
        console.error("Failed to load noncoding mask intervals", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return mask;
};
