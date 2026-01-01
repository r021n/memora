import React from "react";
import { createHashRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import Home from "./pages/Home";
import Manage from "./pages/Manage";
import Exercise from "./pages/Exercise";

export const router = createHashRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/manage", element: <Manage /> },
      { path: "/exercise", element: <Exercise /> },
    ],
  },
]);
