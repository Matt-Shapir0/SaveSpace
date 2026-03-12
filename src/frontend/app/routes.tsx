import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { Chat } from "./pages/Chat";
import { PodcastPlayer } from "./pages/PodcastPlayer";
import { Insights } from "./pages/Insights";
import { Profile } from "./pages/Profile";
import { ShareHandler } from "./pages/ShareHandler";

export const router = createBrowserRouter([
  // /share is intentionally OUTSIDE the Layout wrapper so there's no nav bar
  // while the share is being processed — it's a transient screen.
  {
    path: "/share",
    element: <ShareHandler />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: "library", element: <Library /> },
      { path: "chat", element: <Chat /> },
      { path: "podcast/:id", element: <PodcastPlayer /> },
      { path: "insights", element: <Insights /> },
      { path: "profile", element: <Profile /> },
    ],
  },
]);
