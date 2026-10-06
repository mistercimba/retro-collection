export type WishlistArtworkCandidate = {
  id: string;
  title: string;
  platform: string;
  artworkRegion: "Europe" | "US" | "Japan";
  displayRegion: string;
  coverVariant: string;
  source: "libretro-thumbnails";
  sourceRepo: string;
  sourceCommit: string;
  sourcePath: string;
  sourceUrl: string;
};

export const WISHLIST_ARTWORK_CANDIDATES: WishlistArtworkCandidate[] = [
  {
    id: "libretro-ff8-europe-australia",
    title: "Final Fantasy VIII",
    platform: "Playstation",
    artworkRegion: "Europe",
    displayRegion: "Europe / Australia",
    coverVariant: "Standard",
    source: "libretro-thumbnails",
    sourceRepo: "libretro-thumbnails/Sony_-_PlayStation",
    sourceCommit: "ccee75c7744d81676b6725307aca27ef6be6231a",
    sourcePath: "Named_Boxarts/Final Fantasy VIII (Europe, Australia).png",
    sourceUrl: "https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation/ccee75c7744d81676b6725307aca27ef6be6231a/Named_Boxarts/Final%20Fantasy%20VIII%20(Europe%2C%20Australia).png",
  },
  {
    id: "libretro-ff8-spain",
    title: "Final Fantasy VIII",
    platform: "Playstation",
    artworkRegion: "Europe",
    displayRegion: "Spain",
    coverVariant: "Standard",
    source: "libretro-thumbnails",
    sourceRepo: "libretro-thumbnails/Sony_-_PlayStation",
    sourceCommit: "ccee75c7744d81676b6725307aca27ef6be6231a",
    sourcePath: "Named_Boxarts/Final Fantasy VIII (Spain).png",
    sourceUrl: "https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation/ccee75c7744d81676b6725307aca27ef6be6231a/Named_Boxarts/Final%20Fantasy%20VIII%20(Spain).png",
  },
];
