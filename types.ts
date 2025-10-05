// types.ts (or your existing types file)

// A reusable LessonItem type for your lessons array
export type LessonItem = {
  id: string;
  title: string;
  subtitle: string;
  done?: boolean;
};

// Navigation param list
export type RootStackParamList = {
  Splash: undefined;
  LogIn: undefined;
  SignUp: undefined;
  Home: undefined;
  Lessons: undefined;
  Settings: undefined;
  NibbleAi: undefined;
  // LessonDetail can optionally receive generatedContent (AI JSON)
  LessonDetail: { id: string; title?: string; subtitle?: string; generatedContent?: any };
  // Quiz can optionally receive a generated quiz array from the AI
  Quiz: { lessonId: string; title?: string; subtitle?: string; quiz?: any };
  Comment: { noteId: string };
  Progress: undefined;
};
