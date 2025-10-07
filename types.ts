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
