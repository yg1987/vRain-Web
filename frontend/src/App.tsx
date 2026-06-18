import { Routes, Route } from "react-router-dom";
import ProjectLayout from "./components/ProjectLayout";
import ProjectList from "./components/ProjectList";
import ProjectDetail from "./components/ProjectDetail";

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectList />} />
      <Route path="/project/:id" element={<ProjectLayout />}>
        <Route index element={<ProjectDetail />} />
      </Route>
    </Routes>
  );
}

export default App;
