export type RootStackParamList = {
  Splash: undefined;
  LogIn: undefined;
  SignUp: undefined;
  Home: undefined;
  Lessons: undefined;
  Settings: undefined;
  NibbleAi: undefined;
  LessonDetail: { id: string; title?: string; subtitle?: string };
  Quiz: { lessonId: string; title?: string; subtitle?: string };
  Comment: { noteId: string };
  Progress: undefined;
};
