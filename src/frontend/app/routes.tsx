import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { Profile } from "./pages/Profile";
import { Chat } from "./pages/Chat";
import { PodcastPlayer } from "./pages/PodcastPlayer";
import { Insights } from  "./pages/Insights";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "library", Component: Library },
      { path: "profile", Component: Profile },
      { path: "chat", Component: Chat },
      { path: "podcast/:id", Component: PodcastPlayer },
      { path: "insights", Component: Insights }
    ],
  },
]);