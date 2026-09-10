export type Accuracy = "hit" | "left" | "right" | "short" | "long";

export type TeeClub =
  | "Driver" | "3W" | "4W" | "5W" | "Hybrid"
  | "2i" | "3i" | "4i" | "5i" | "6i" | "7i" | "8i" | "9i"
  | "Pw" | "Sw" | "Lw" | "Putter";

export type CourseHoleTemplate = {
  hole: number;
  si: number;
  par: number;
  yards: number;
};

export type HoleScore = {
  hole: number;
  gross: number;
  putts: number;
  accuracy: Accuracy;
  teeClub: TeeClub | null;
  sandShots: number | null;
  penalties: number | null;
};

export type ProjectedHole = CourseHoleTemplate &
  HoleScore & {
    gir: boolean;
    strokesReceived: number | null;
    net: number | null;
    scoreVsPar: number;
    netVsPar: number | null;
  };

export type CourseSnapshot = {
  name: string;
  tee: string;
  coursePar: number;
  totalYards: number;
  slopeRating: number | null;
  courseRating: number | null;
  holes: CourseHoleTemplate[];
};

export type Course = {
  id: string;
  userId: string;
  name: string;
  tee: string;
  coursePar: number;
  totalYards: number;
  slopeRating: number | null;
  courseRating: number | null;
  holes: CourseHoleTemplate[];
  createdAt: string;
  updatedAt: string;
};

export type Round = {
  id: string;
  userId: string;
  courseId: string | null;
  playedAt: string;
  handicapIndex: number | null;
  status: "complete";
  holes: HoleScore[];
  courseSnapshot: CourseSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type DraftHoleScore = {
  hole: number;
  gross: number | null;
  putts: number | null;
  accuracy: Accuracy | null;
  teeClub: TeeClub | null;
  sandShots: number | null;
  penalties: number | null;
};

export type DraftRound = {
  id: string;
  userId: string;
  courseId: string | null;
  playedAt: string;
  handicapIndex: number | null;
  status: "in_progress";
  holes: DraftHoleScore[];
  courseSnapshot: CourseSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type CourseInput = Omit<Course, "id" | "userId" | "createdAt" | "updatedAt">;
