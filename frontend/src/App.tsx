import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProjectLayout from "./components/ProjectLayout";
import ProjectList from "./components/ProjectList";
import ProjectDetail from "./components/ProjectDetail";

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectLayout />}>
          <Route index element={<ProjectDetail />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
