export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

export type MainStackParamList = {
  Dashboard: undefined;
  Home: undefined;
  FakeNewsDetection: undefined;
  ImageDeepfakeDetection: undefined;
  VideoDeepfakeDetection: undefined;
  Result: { type: string; data: any };
  Explanation: { data: any };
  History: undefined;
  Profile: undefined;
  Chat: undefined;
  Settings: undefined;
};
