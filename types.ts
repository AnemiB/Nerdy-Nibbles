import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

export type LessonItem = {
  id: string;
  title: string;
  subtitle: string;
  done?: boolean;
};

export type RootStackParamList = {
  Splash: undefined;
  LogIn: undefined;
  SignUp: undefined;
  Home: undefined;
  Lessons: undefined;
  Settings: undefined;
  NibbleAi: undefined;
  LessonDetail: { id: string; title?: string; subtitle?: string; generatedContent?: any };
  Quiz: { lessonId: string; title?: string; subtitle?: string; quiz?: any };
  Comment: { noteId: string };
  Progress: undefined;
};

export type Message = {
  id: string;
  sender: "me" | "ai";
  text: string;
};

export type QuizQuestion = {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
};

export type RecentActivity = {
  id?: string;
  title: string;
  subtitle?: string;
  done?: boolean;
  timestamp?: any;
  createdAt?: any;
};

export type UserProfile = {
  name?: string;
  email?: string;
  lessonsCompleted?: number;
  totalLessons?: number;
  completedLessons?: string[];
  recentActivities?: RecentActivity[];
  createdAt?: any;
  lastUpdated?: any;
};

export type Props = {
  visible?: boolean;
  onClose?: () => void;
  onViewProgress?: () => void;
  onBackToLessons?: () => void;
  score: number;
  total: number;
  percent: number;
  lessonsCompletedCount: number;
  loading?: boolean;
  userName?: string | null;
  userUid?: string | null;
  [key: string]: any;
};

export type QuizProps = {
  visible?: boolean;
  onClose?: () => void;
  onViewProgress?: () => void;
  onBackToLessons?: () => void;
  correctCount: number; // number correct (0..3)
  lessonsCompletedCount?: number;
  loading?: boolean;
  userName?: string | null;
  userUid?: string | null;
  [key: string]: any;
};

export type NibbleNavProp = NativeStackNavigationProp<RootStackParamList, "Settings">;

export type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export type SignUpNavProp = NativeStackNavigationProp<RootStackParamList, "SignUp">;

export type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export type LessonDetailNavProp = NativeStackNavigationProp<RootStackParamList, "LessonDetail">;

export type LessonDetailRouteProp = RouteProp<RootStackParamList, "LessonDetail">;

export type LessonsNavProp = NativeStackNavigationProp<RootStackParamList, "Lessons">;

export type LoginNavProp = NativeStackNavigationProp<RootStackParamList, "LogIn">;






