import React from "react";
import { RouterProvider } from "react-router-dom";
import { StoreProvider } from "./context/StoreContext";
import { router } from "./router";

const App: React.FC = () => {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
};

export default App;
